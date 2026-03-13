# T3 Sentinel — Python SDK

Real-time hallucination detection for AI systems. The T3 Sentinel SDK connects
to the T3 Hallucination Detection Engine (HDE), which extracts factual claims
from AI-generated text and verifies them against your brand's ground-truth
product catalogue — prices, features, availability, and policies — before the
response ever reaches your users.

---

## Installation

```bash
pip install t3-sentinel
```

With optional LLM provider extras:

```bash
pip install "t3-sentinel[openai]"       # adds openai
pip install "t3-sentinel[anthropic]"    # adds anthropic
pip install "t3-sentinel[all]"          # adds both
```

**Requires Python 3.9+.**

---

## Quick start

Three lines to check any AI-generated text:

```python
from t3_sentinel import T3Sentinel

sentinel = T3Sentinel(api_key="t3_live_xxx")
result = sentinel.check(text=ai_output, brand_id=4)

if not result["safe"]:
    ai_output = result["corrected_text"]
```

Or even shorter — get a clean string back directly:

```python
safe_output = sentinel.check_or_correct(text=ai_output, brand_id=4)
```

---

## Understanding the three modes

Pass `mode` to `check()` to control what happens when hallucinations are found.

| Mode | What it does | When to use |
|------|-------------|-------------|
| `"block"` | Replaces wrong claims with verified ground truth before returning | Customer-facing chatbots, support agents |
| `"flag"` | Returns original text unchanged; attaches flagged claims to the response | Human-review queues, audit dashboards |
| `"log"` | Records the check silently for analytics; returns original text | Shadow mode, A/B testing, baseline metrics |

```python
# block — auto-correct hallucinations
result = sentinel.check(text=ai_output, brand_id=4, mode="block")
final_text = result["corrected_text"] or result["original_text"]

# flag — surface claims for a human reviewer
result = sentinel.check(text=ai_output, brand_id=4, mode="flag")
for claim in result["claims"]:
    if claim["status"] == "hallucinated":
        queue_for_review(claim)

# log — zero-impact monitoring
result = sentinel.check(text=ai_output, brand_id=4, mode="log")
# result["original_text"] is unchanged; check is recorded server-side
```

---

## Response structure

Every `check()` call returns a dict:

```python
{
    "safe": False,                          # True when no hallucinations found
    "original_text": "...",                 # The text you submitted
    "corrected_text": "...",                # Auto-corrected (block mode only)
    "claims_checked": 3,                    # Total claims extracted
    "hallucinations_found": 1,              # Number of wrong claims
    "mode": "block",
    "action_taken": "response_corrected",   # What the engine did
    "claims": [
        {
            "claim": "$29.99",
            "type": "pricing",
            "status": "hallucinated",       # accurate | hallucinated | outdated
            "ground_truth": "$34.99",
            "confidence": 0.95,
            "product": "ProPaint Ultra",
        },
        ...
    ],
}
```

`action_taken` values: `"response_corrected"`, `"claims_flagged"`,
`"silently_logged"`, `"passed_clean"`.

---

## OpenAI wrapper

Wrap your OpenAI client once and every completion is automatically checked.
No other code changes required.

```python
from openai import OpenAI
from t3_sentinel import T3Sentinel

sentinel = T3Sentinel(api_key="t3_live_xxx")
openai = sentinel.wrap_openai(OpenAI(), brand_id=4)

# Works exactly like the standard OpenAI client
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Tell me about the ProPaint Ultra"}],
)

# response.choices[0].message.content is already verified and corrected
print(response.choices[0].message.content)
```

The wrapper is a transparent proxy — all attributes not related to
`chat.completions.create()` are forwarded directly to the underlying client,
so pagination helpers, file uploads, and every other OpenAI API method work
unchanged.

---

## Anthropic wrapper

```python
import anthropic
from t3_sentinel import T3Sentinel

sentinel = T3Sentinel(api_key="t3_live_xxx")
claude = sentinel.wrap_anthropic(anthropic.Anthropic(), brand_id=4)

response = claude.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{"role": "user", "content": "What does the ProPaint Ultra cost?"}],
)

# response.content[0].text is already verified and corrected
print(response.content[0].text)
```

---

## Async support

All sync methods have async equivalents: `acheck()`, `acheck_or_correct()`.
Use the async context manager to ensure the connection is closed cleanly.

```python
import asyncio
from t3_sentinel import T3Sentinel

async def verify(ai_output: str) -> str:
    async with T3Sentinel(api_key="t3_live_xxx") as sentinel:
        result = await sentinel.acheck(
            text=ai_output,
            brand_id=4,
            mode="block",
        )
        return result.get("corrected_text") or ai_output

# FastAPI example
from fastapi import FastAPI

app = FastAPI()
sentinel = T3Sentinel(api_key="t3_live_xxx")

@app.post("/chat")
async def chat(body: dict):
    ai_response = await call_llm(body["message"])
    safe_response = await sentinel.acheck_or_correct(
        text=ai_response,
        brand_id=4,
    )
    return {"response": safe_response}
```

---

## Error handling

```python
from t3_sentinel import T3Sentinel, T3Error, HallucinationDetected

sentinel = T3Sentinel(api_key="t3_live_xxx")

# --- Option A: check the result dict (default, no exceptions) ---
result = sentinel.check(text=ai_output, brand_id=4, mode="block")
if not result["safe"]:
    print(f"Fixed {result['hallucinations_found']} hallucination(s)")
    ai_output = result["corrected_text"]

# --- Option B: raise on hallucination ---
try:
    result = sentinel.check(
        text=ai_output,
        brand_id=4,
        raise_on_hallucination=True,
    )
except HallucinationDetected as exc:
    print(f"Caught {exc.hallucinations_found} hallucination(s)")
    safe_text = exc.corrected_text or "[response withheld]"
    for claim in exc.claims:
        print(f"  [{claim['type']}] {claim['claim']} -> {claim['ground_truth']}")

# --- Option C: catch all T3 errors ---
try:
    result = sentinel.check(text=ai_output, brand_id=4)
except T3Error as exc:
    # Covers network failures, 4xx/5xx API errors, and HallucinationDetected
    print(f"T3 error: {exc}")
    # Decide whether to fail open or closed
    fallback_response = ai_output
```

`HallucinationDetected` is a subclass of `T3Error`, so a single
`except T3Error` clause catches everything.

---

## Context managers

```python
# Synchronous
with T3Sentinel(api_key="t3_live_xxx") as sentinel:
    result = sentinel.check(text=ai_output, brand_id=4)

# Asynchronous
async with T3Sentinel(api_key="t3_live_xxx") as sentinel:
    result = await sentinel.acheck(text=ai_output, brand_id=4)
```

---

## API health check

```python
info = sentinel.status()
print(info["status"])           # "operational"
print(info["stats"]["total_checks"])
print(info["avg_response_ms"])  # typically ~45 ms
```

---

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | required | Your T3 API key (`t3_live_...` or `t3_test_...`) |
| `base_url` | `https://api.t3tx.com` | Override for self-hosted or staging environments |
| `timeout` | `30.0` | HTTP request timeout in seconds |

```python
sentinel = T3Sentinel(
    api_key="t3_live_xxx",
    base_url="https://staging.t3tx.com",  # staging
    timeout=10.0,
)
```

---

## License

MIT
