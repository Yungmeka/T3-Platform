"""
T3 Sentinel — AI Hallucination Detection SDK.

Integrate real-time hallucination detection into any AI system with a single
function call.  The SDK talks to the T3 Hallucination Detection Engine (HDE),
which extracts factual claims from AI-generated text and verifies them against
your brand's ground-truth product catalogue.

Quick start:

    from t3_sentinel import T3Sentinel

    sentinel = T3Sentinel(api_key="t3_live_xxx")
    result = sentinel.check(text=ai_output, brand_id=4)

    if not result["safe"]:
        ai_output = result["corrected_text"]

See the README and individual class docs for full usage details.
"""

from .client import T3Sentinel
from .exceptions import HallucinationDetected, T3Error

__version__ = "0.1.0"
__all__ = ["T3Sentinel", "T3Error", "HallucinationDetected"]
