"""
T3 Sentinel SDK — Main client.

Provides synchronous and asynchronous interfaces to the T3 Hallucination
Detection Engine (HDE) API, plus drop-in wrappers for OpenAI and Anthropic
clients that intercept responses and auto-correct hallucinations before they
reach your application.
"""

from __future__ import annotations

from typing import Any

import httpx

from .exceptions import HallucinationDetected, T3Error
from .wrappers import AnthropicWrapper, OpenAIWrapper

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_DEFAULT_BASE_URL = "https://api.t3tx.com"
_DEFAULT_TIMEOUT = 30.0


class T3Sentinel:
    """T3 Sentinel — AI Hallucination Detection SDK.

    Entry point for all interactions with the T3 HDE API.  Use :meth:`check`
    (or :meth:`acheck` for async callers) to verify AI-generated text against
    your brand's ground-truth product data.

    The client manages a persistent ``httpx`` connection pool for sync calls
    and lazily initialises an ``httpx.AsyncClient`` for async calls.  Use the
    client as a context manager to ensure connections are released:

    .. code-block:: python

        with T3Sentinel(api_key="t3_live_xxx") as sentinel:
            result = sentinel.check(text=ai_output, brand_id=4)

    Args:
        api_key: Your T3 API key (starts with ``t3_live_`` or ``t3_test_``).
        base_url: Override the default API base URL.  Useful for self-hosted
            deployments or when pointing at a staging environment.
        timeout: HTTP request timeout in seconds.  Applies to both sync and
            async clients.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._timeout = timeout

        self._client = httpx.Client(
            base_url=self.base_url,
            headers={
                "X-API-Key": api_key,
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )
        self._async_client: httpx.AsyncClient | None = None

    # ------------------------------------------------------------------
    # Synchronous API
    # ------------------------------------------------------------------

    def check(
        self,
        text: str,
        brand_id: int,
        mode: str = "block",
        raise_on_hallucination: bool = False,
    ) -> dict[str, Any]:
        """Check AI-generated text for hallucinations against brand ground truth.

        Sends ``text`` to the HDE, which extracts factual claims (prices,
        features, availability, policies) and verifies them against the
        products registered for ``brand_id``.

        Args:
            text: The AI-generated text to verify.  Must be between 1 and
                10,000 characters.
            brand_id: Your numeric brand ID on the T3 platform.  The HDE uses
                this to load the correct ground-truth product catalogue.
            mode: How the HDE should respond when hallucinations are found.

                - ``"block"`` — Returns corrected text with wrong claims
                  replaced by verified ground truth values.
                - ``"flag"`` — Returns the original text unchanged, but
                  ``claims`` in the response will contain flagged entries.
                - ``"log"`` — Silently records the check for analytics and
                  returns the original text.  Zero latency impact on your UX.

            raise_on_hallucination: When ``True`` and the response is not
                safe, raise :class:`~t3_sentinel.HallucinationDetected` instead
                of returning the result dict.  Defaults to ``False``.

        Returns:
            A dict with the following keys:

            - ``safe`` (bool): ``True`` when no hallucinations were found.
            - ``original_text`` (str): The text you submitted.
            - ``corrected_text`` (str | None): Auto-corrected text (only
              populated in ``block`` mode when ``safe`` is ``False``).
            - ``claims_checked`` (int): Total number of claims extracted.
            - ``hallucinations_found`` (int): Number of hallucinated claims.
            - ``claims`` (list[dict]): Per-claim detail including type,
              status, ground truth, and confidence score.
            - ``mode`` (str): The mode that was used.
            - ``action_taken`` (str): What the engine did (``"response_corrected"``,
              ``"claims_flagged"``, ``"silently_logged"``, or ``"passed_clean"``).

        Raises:
            HallucinationDetected: When ``raise_on_hallucination=True`` and
                the response is not safe.
            T3Error: On non-2xx HTTP responses or network failures.

        Example:
            result = sentinel.check(
                text="The ProPaint Ultra covers 400 sq ft and costs $29.99.",
                brand_id=4,
                mode="block",
            )
            if not result["safe"]:
                safe_text = result["corrected_text"]
        """
        payload: dict[str, Any] = {
            "text": text,
            "brand_id": brand_id,
            "mode": mode,
        }
        try:
            resp = self._client.post("/api/hde/check", json=payload)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise T3Error(
                f"API error {exc.response.status_code}: {exc.response.text}"
            ) from exc
        except httpx.RequestError as exc:
            raise T3Error(f"Connection error: {exc}") from exc

        result: dict[str, Any] = resp.json()

        if raise_on_hallucination and not result.get("safe", True):
            raise HallucinationDetected(result)

        return result

    def check_or_correct(self, text: str, brand_id: int) -> str:
        """Return corrected text if hallucinations are found, otherwise return original.

        Convenience wrapper around :meth:`check` that always uses ``block``
        mode and returns a plain string rather than the full result dict.

        Args:
            text: The AI-generated text to verify.
            brand_id: Your numeric brand ID on the T3 platform.

        Returns:
            The corrected text when hallucinations were found, or the original
            ``text`` unchanged when the response is clean.

        Raises:
            T3Error: On non-2xx HTTP responses or network failures.

        Example:
            safe_response = sentinel.check_or_correct(
                text=llm_output,
                brand_id=4,
            )
            return safe_response
        """
        result = self.check(text, brand_id=brand_id, mode="block")
        return result.get("corrected_text") or text

    def status(self) -> dict[str, Any]:
        """Retrieve HDE API health and usage statistics.

        Returns:
            A dict with keys ``status``, ``engine``, ``version``, ``stats``
            (containing ``total_checks``, ``hallucinations_caught``,
            ``claims_checked``, and ``started_at``), and ``avg_response_ms``.

        Raises:
            T3Error: On non-2xx HTTP responses or network failures.

        Example:
            info = sentinel.status()
            print(info["stats"]["total_checks"])
        """
        try:
            resp = self._client.get("/api/hde/status")
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise T3Error(
                f"API error {exc.response.status_code}: {exc.response.text}"
            ) from exc
        except httpx.RequestError as exc:
            raise T3Error(f"Connection error: {exc}") from exc
        return resp.json()

    # ------------------------------------------------------------------
    # Async API
    # ------------------------------------------------------------------

    @property
    def _async(self) -> httpx.AsyncClient:
        """Lazily-initialised async HTTP client."""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json",
                },
                timeout=self._timeout,
            )
        return self._async_client

    async def acheck(
        self,
        text: str,
        brand_id: int,
        mode: str = "block",
        raise_on_hallucination: bool = False,
    ) -> dict[str, Any]:
        """Async version of :meth:`check`.

        Identical semantics to :meth:`check`; use this in async contexts
        (FastAPI route handlers, async LangChain chains, etc.) to avoid
        blocking the event loop.

        Args:
            text: The AI-generated text to verify.
            brand_id: Your numeric brand ID on the T3 platform.
            mode: ``"block"``, ``"flag"``, or ``"log"``.  See :meth:`check`.
            raise_on_hallucination: Raise :class:`~t3_sentinel.HallucinationDetected`
                instead of returning the result dict when hallucinations are found.

        Returns:
            Same dict structure as :meth:`check`.

        Raises:
            HallucinationDetected: When ``raise_on_hallucination=True`` and the
                response is not safe.
            T3Error: On non-2xx HTTP responses or network failures.

        Example:
            result = await sentinel.acheck(
                text=llm_output,
                brand_id=4,
                mode="block",
            )
        """
        payload: dict[str, Any] = {
            "text": text,
            "brand_id": brand_id,
            "mode": mode,
        }
        try:
            resp = await self._async.post("/api/hde/check", json=payload)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise T3Error(
                f"API error {exc.response.status_code}: {exc.response.text}"
            ) from exc
        except httpx.RequestError as exc:
            raise T3Error(f"Connection error: {exc}") from exc

        result: dict[str, Any] = resp.json()

        if raise_on_hallucination and not result.get("safe", True):
            raise HallucinationDetected(result)

        return result

    async def acheck_or_correct(self, text: str, brand_id: int) -> str:
        """Async version of :meth:`check_or_correct`.

        Args:
            text: The AI-generated text to verify.
            brand_id: Your numeric brand ID on the T3 platform.

        Returns:
            Corrected text if hallucinations were found, otherwise the original ``text``.

        Raises:
            T3Error: On non-2xx HTTP responses or network failures.
        """
        result = await self.acheck(text, brand_id=brand_id, mode="block")
        return result.get("corrected_text") or text

    # ------------------------------------------------------------------
    # LLM wrapper factories
    # ------------------------------------------------------------------

    def wrap_openai(self, openai_client: Any, brand_id: int) -> OpenAIWrapper:
        """Wrap an OpenAI client so all completions are auto-checked.

        Returns a transparent proxy object that behaves exactly like the
        original OpenAI client.  Every call to
        ``client.chat.completions.create()`` is intercepted: after the model
        responds, each choice's ``message.content`` is passed through the HDE
        in ``block`` mode and replaced with corrected text if needed.

        Args:
            openai_client: An instantiated ``openai.OpenAI`` client.
            brand_id: Your numeric brand ID, forwarded to the HDE on every
                check call.

        Returns:
            An :class:`~t3_sentinel.wrappers.OpenAIWrapper` that mirrors the
            full OpenAI client API.

        Example:
            from openai import OpenAI
            from t3_sentinel import T3Sentinel

            sentinel = T3Sentinel(api_key="t3_live_xxx")
            openai = sentinel.wrap_openai(OpenAI(), brand_id=4)

            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "Tell me about Product X"}],
            )
            # response.choices[0].message.content is already verified
        """
        return OpenAIWrapper(openai_client, self, brand_id)

    def wrap_anthropic(self, anthropic_client: Any, brand_id: int) -> AnthropicWrapper:
        """Wrap an Anthropic client so all messages are auto-checked.

        Returns a transparent proxy object that behaves exactly like the
        original Anthropic client.  Every call to
        ``client.messages.create()`` is intercepted: after the model
        responds, each text content block is passed through the HDE in
        ``block`` mode and replaced with corrected text if needed.

        Args:
            anthropic_client: An instantiated ``anthropic.Anthropic`` client.
            brand_id: Your numeric brand ID, forwarded to the HDE on every
                check call.

        Returns:
            An :class:`~t3_sentinel.wrappers.AnthropicWrapper` that mirrors
            the full Anthropic client API.

        Example:
            import anthropic
            from t3_sentinel import T3Sentinel

            sentinel = T3Sentinel(api_key="t3_live_xxx")
            claude = sentinel.wrap_anthropic(anthropic.Anthropic(), brand_id=4)

            response = claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": "Tell me about Product X"}],
            )
            # response.content[0].text is already verified
        """
        return AnthropicWrapper(anthropic_client, self, brand_id)

    # ------------------------------------------------------------------
    # Resource management
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Close the underlying synchronous HTTP client and release connections.

        The async client must be closed separately with :meth:`aclose` from
        within an async context.
        """
        self._client.close()

    async def aclose(self) -> None:
        """Close the underlying async HTTP client and release connections.

        Call this from within an async context when you are done with the
        client and are not using it as an async context manager.
        """
        if self._async_client is not None:
            await self._async_client.aclose()

    def __enter__(self) -> "T3Sentinel":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    async def __aenter__(self) -> "T3Sentinel":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.aclose()

    def __repr__(self) -> str:
        key_preview = f"{self.api_key[:8]}..." if len(self.api_key) > 8 else self.api_key
        return f"T3Sentinel(api_key='{key_preview}', base_url='{self.base_url}')"
