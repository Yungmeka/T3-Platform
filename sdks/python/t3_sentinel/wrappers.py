"""
T3 Sentinel SDK — LLM client wrappers.

Transparent proxy objects that wrap OpenAI and Anthropic clients so that
every completion or message response is automatically fact-checked by the
HDE before it reaches your application code.

Usage:
    # OpenAI
    from openai import OpenAI
    from t3_sentinel import T3Sentinel

    sentinel = T3Sentinel(api_key="t3_live_xxx")
    openai = sentinel.wrap_openai(OpenAI())
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Tell me about Product X"}],
    )
    # response.choices[0].message.content is already verified / corrected

    # Anthropic
    import anthropic
    claude = sentinel.wrap_anthropic(anthropic.Anthropic())
    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Tell me about Product X"}],
    )
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .client import T3Sentinel


# ---------------------------------------------------------------------------
# OpenAI wrappers
# ---------------------------------------------------------------------------


class CompletionsProxy:
    """Wraps ``openai.resources.chat.completions.Completions``.

    Intercepts ``create()`` calls, runs each choice's text through the HDE,
    and patches the message content in-place before returning the response
    object so the rest of your code sees only clean, verified text.

    All other attributes are forwarded transparently to the underlying
    completions resource via ``__getattr__``.
    """

    def __init__(self, completions: Any, sentinel: "T3Sentinel", brand_id: int | None) -> None:
        self._completions = completions
        self._sentinel = sentinel
        self._brand_id = brand_id

    def create(self, **kwargs: Any) -> Any:
        """Create a chat completion and auto-check every choice for hallucinations.

        Args:
            **kwargs: All keyword arguments forwarded verbatim to the underlying
                ``openai.chat.completions.create()`` call.

        Returns:
            The original OpenAI response object, with ``choice.message.content``
            replaced by corrected text for any choices that contained hallucinations.
        """
        response = self._completions.create(**kwargs)
        for choice in response.choices:
            if choice.message and choice.message.content:
                result = self._sentinel.check(
                    choice.message.content,
                    mode="block",
                    brand_id=self._brand_id,
                )
                if not result["safe"] and result.get("corrected_text"):
                    choice.message.content = result["corrected_text"]
        return response

    def __getattr__(self, name: str) -> Any:
        return getattr(self._completions, name)


class ChatProxy:
    """Wraps ``openai.resources.chat.Chat``.

    Exposes a ``completions`` attribute that is a :class:`CompletionsProxy`.
    All other attributes are forwarded to the underlying chat resource.
    """

    def __init__(self, chat: Any, sentinel: "T3Sentinel", brand_id: int | None) -> None:
        self._chat = chat
        self._sentinel = sentinel
        self.completions = CompletionsProxy(chat.completions, sentinel, brand_id)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._chat, name)


class OpenAIWrapper:
    """Transparent proxy around an OpenAI client with auto hallucination detection.

    Drop-in replacement for ``openai.OpenAI``. All API surface is forwarded
    transparently; only ``chat.completions.create()`` is intercepted to run
    HDE checks on every response choice.

    Args:
        openai_client: An instantiated ``openai.OpenAI`` (or ``AsyncOpenAI``) client.
        sentinel: The :class:`~t3_sentinel.T3Sentinel` instance to use for checks.
        brand_id: Brand ID passed to the HDE on every check. Required by the API
            unless your API key is scoped to a single brand on the T3 platform.

    Example:
        from openai import OpenAI
        from t3_sentinel import T3Sentinel

        sentinel = T3Sentinel(api_key="t3_live_xxx")
        openai = sentinel.wrap_openai(OpenAI(), brand_id=4)

        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "What does Product X cost?"}],
        )
        print(response.choices[0].message.content)  # already corrected
    """

    def __init__(self, openai_client: Any, sentinel: "T3Sentinel", brand_id: int | None) -> None:
        self._client = openai_client
        self._sentinel = sentinel
        self.chat = ChatProxy(openai_client.chat, sentinel, brand_id)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)


# ---------------------------------------------------------------------------
# Anthropic wrappers
# ---------------------------------------------------------------------------


class MessagesProxy:
    """Wraps ``anthropic.resources.Messages``.

    Intercepts ``create()`` calls and runs every text content block through
    the HDE, patching the block's ``text`` attribute in-place before
    returning the response.

    All other attributes are forwarded transparently.
    """

    def __init__(self, messages: Any, sentinel: "T3Sentinel", brand_id: int | None) -> None:
        self._messages = messages
        self._sentinel = sentinel
        self._brand_id = brand_id

    def create(self, **kwargs: Any) -> Any:
        """Create a message and auto-check every text block for hallucinations.

        Args:
            **kwargs: All keyword arguments forwarded verbatim to the underlying
                ``anthropic.messages.create()`` call.

        Returns:
            The original Anthropic response object, with text content blocks
            replaced by corrected text where hallucinations were found.
        """
        response = self._messages.create(**kwargs)
        for block in response.content:
            if hasattr(block, "text") and block.text:
                result = self._sentinel.check(
                    block.text,
                    mode="block",
                    brand_id=self._brand_id,
                )
                if not result["safe"] and result.get("corrected_text"):
                    block.text = result["corrected_text"]
        return response

    def __getattr__(self, name: str) -> Any:
        return getattr(self._messages, name)


class AnthropicWrapper:
    """Transparent proxy around an Anthropic client with auto hallucination detection.

    Drop-in replacement for ``anthropic.Anthropic``. All API surface is
    forwarded transparently; only ``messages.create()`` is intercepted to
    run HDE checks on every text content block in the response.

    Args:
        anthropic_client: An instantiated ``anthropic.Anthropic`` client.
        sentinel: The :class:`~t3_sentinel.T3Sentinel` instance to use for checks.
        brand_id: Brand ID passed to the HDE on every check. Required by the API
            unless your API key is scoped to a single brand on the T3 platform.

    Example:
        import anthropic
        from t3_sentinel import T3Sentinel

        sentinel = T3Sentinel(api_key="t3_live_xxx")
        claude = sentinel.wrap_anthropic(anthropic.Anthropic(), brand_id=4)

        response = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": "What does Product X cost?"}],
        )
        print(response.content[0].text)  # already corrected
    """

    def __init__(self, anthropic_client: Any, sentinel: "T3Sentinel", brand_id: int | None) -> None:
        self._client = anthropic_client
        self._sentinel = sentinel
        self.messages = MessagesProxy(anthropic_client.messages, sentinel, brand_id)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)
