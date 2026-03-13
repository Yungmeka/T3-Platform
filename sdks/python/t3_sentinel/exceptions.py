"""
T3 Sentinel SDK — Custom exceptions.

Hierarchy:
    T3Error
    └── HallucinationDetected
"""


class T3Error(Exception):
    """Base exception for all T3 Sentinel SDK errors.

    Raised for API-level errors (non-2xx responses, network failures,
    and other SDK-level problems). Catch this to handle all T3 errors
    in a single except clause.

    Example:
        from t3_sentinel import T3Sentinel, T3Error

        sentinel = T3Sentinel(api_key="t3_live_xxx")
        try:
            result = sentinel.check(text="...", brand_id=4)
        except T3Error as e:
            print(f"T3 error: {e}")
    """


class HallucinationDetected(T3Error):
    """Raised when hallucinations are detected in block mode.

    Only raised when you call ``check()`` with ``raise_on_hallucination=True``
    (not the default). The corrected text and raw claim data are available
    as attributes so callers can choose how to proceed.

    Attributes:
        result: The full response dict returned by the API.
        claims: List of individual claim result dicts.
        corrected_text: The auto-corrected text produced by the API,
            or ``None`` if no correction was generated.
        hallucinations_found: Number of hallucinations the engine caught.

    Example:
        from t3_sentinel import T3Sentinel, HallucinationDetected

        sentinel = T3Sentinel(api_key="t3_live_xxx")
        try:
            result = sentinel.check(
                text=ai_response,
                brand_id=4,
                raise_on_hallucination=True,
            )
        except HallucinationDetected as exc:
            safe_text = exc.corrected_text or "[response withheld]"
            print(f"Caught {exc.hallucinations_found} hallucination(s)")
    """

    def __init__(self, result: dict) -> None:
        self.result: dict = result
        self.claims: list[dict] = result.get("claims", [])
        self.corrected_text: str | None = result.get("corrected_text")
        self.hallucinations_found: int = result.get("hallucinations_found", 0)
        super().__init__(f"Found {self.hallucinations_found} hallucination(s)")
