# T3 Sentinel JavaScript SDK

Stop hallucinations from reaching your customers. The T3 Sentinel SDK sits between your AI model and your users, checking every response against verified product data in real time.

## Installation

```bash
npm install @t3sentinel/sdk
```

Node.js 18 or later is required (the SDK uses the native `fetch` and `AbortSignal.timeout` APIs).

---

## Quick start

```js
const { T3Sentinel } = require("@t3sentinel/sdk");

const sentinel = new T3Sentinel({ apiKey: "t3_live_xxx" });
const result = await sentinel.check(aiOutput, { brandId: 4 });
if (!result.safe) console.log("Corrected:", result.corrected_text);
```

---

## Concepts

### Brand ID

Every check is scoped to a brand. The `brandId` tells the engine which product catalog to use as ground truth when evaluating claims. You can find your brand ID in the T3 Sentinel dashboard.

### Modes

| Mode | What happens |
|------|-------------|
| `block` | Hallucinated claims are replaced with verified ground truth before the result is returned. `corrected_text` is populated when `safe` is false. |
| `flag` | Original text is returned unchanged. `claims` lists each flagged item so your code can decide what to do. |
| `log` | Check is recorded silently for analytics. Original text is returned, no flags raised. |

---

## API reference

### `new T3Sentinel(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Your T3 Sentinel API key (`t3_live_xxx`). Required. |
| `baseUrl` | `string` | `"https://api.t3tx.com"` | API base URL. |
| `timeout` | `number` | `30000` | Per-request timeout in milliseconds. |

---

## Core usage

### `sentinel.check(text, options)`

Check AI-generated text for hallucinations. Returns a full result object.

```js
const result = await sentinel.check(aiOutput, { brandId: 4, mode: "block" });

console.log(result.safe);               // false
console.log(result.hallucinations_found); // 2
console.log(result.corrected_text);     // "...corrected version..."
console.log(result.claims);             // per-claim breakdown
```

**Result object**

| Field | Type | Description |
|-------|------|-------------|
| `safe` | `boolean` | True when no hallucinations were found |
| `original_text` | `string` | The text as submitted |
| `corrected_text` | `string \| null` | Corrected version (block mode only) |
| `claims_checked` | `number` | Total claims evaluated |
| `hallucinations_found` | `number` | Inaccurate or outdated claims |
| `claims` | `ClaimResult[]` | Per-claim breakdown |
| `mode` | `string` | Mode used |
| `action_taken` | `string` | What the engine did |

### `sentinel.checkOrCorrect(text, brandId)`

Returns corrected text when hallucinations are found, otherwise the original. Useful when you only care about the final safe string.

```js
const safeText = await sentinel.checkOrCorrect(aiOutput, 4);
res.json({ response: safeText });
```

### `sentinel.checkOrThrow(text, options)`

Throws `HallucinationDetected` when hallucinations are found. Use this when you want to halt execution and handle the problem in a `catch` block.

```js
try {
  await sentinel.checkOrThrow(aiOutput, { brandId: 4 });
} catch (err) {
  if (err instanceof HallucinationDetected) {
    console.log("Found:", err.claims.length, "bad claims");
    console.log("Safe version:", err.correctedText);
  }
}
```

---

## OpenAI wrapper

Wrap an OpenAI client once and every subsequent `chat.completions.create` call is automatically checked. The `message.content` field is corrected in place — your existing code needs no changes.

```js
const OpenAI = require("openai");
const { T3Sentinel } = require("@t3sentinel/sdk");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sentinel = new T3Sentinel({ apiKey: process.env.T3_API_KEY });

// Patch the client once
const guarded = sentinel.wrapOpenAI(openai, 4);

// All completions are now auto-verified
const response = await guarded.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What does Product X cost?" }],
});

const message = response.choices[0].message;
console.log(message.content);   // already corrected if needed
console.log(message._sentinel); // full detection metadata, or undefined if clean
```

---

## Anthropic wrapper

Same pattern for Anthropic. Text blocks in `response.content` are corrected in place.

```js
const Anthropic = require("@anthropic-ai/sdk");
const { T3Sentinel } = require("@t3sentinel/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const sentinel = new T3Sentinel({ apiKey: process.env.T3_API_KEY });

const guarded = sentinel.wrapAnthropic(anthropic, 4);

const message = await guarded.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "What does Product X cost?" }],
});

const block = message.content[0];
console.log(block.text);       // already corrected if needed
console.log(block._sentinel);  // detection metadata, or undefined if clean
```

---

## Express middleware

The middleware intercepts `res.json()` calls, extracts the AI-generated text from the response body, and runs it through Sentinel before the HTTP response is sent. If the Sentinel API is unavailable the error is logged and the original response is sent unchanged — it never blocks your server.

```js
const express = require("express");
const { T3Sentinel } = require("@t3sentinel/sdk");

const app = express();
app.use(express.json());

const sentinel = new T3Sentinel({ apiKey: process.env.T3_API_KEY });

// Protect a single route
app.post(
  "/api/chat",
  sentinel.middleware({ brandId: 4, field: "response" }),
  async (req, res) => {
    const aiOutput = await callYourLLM(req.body.message);
    // Sentinel intercepts this before it reaches the client
    res.json({ response: aiOutput });
  }
);

// When a correction is made, the body gains a _sentinel summary:
// {
//   response: "...corrected text...",
//   _sentinel: {
//     safe: false,
//     hallucinations_found: 1,
//     action_taken: "response_corrected",
//     claims: [ ... ]
//   }
// }
```

You can protect the entire app by calling `app.use(sentinel.middleware({ brandId: 4 }))` before your routes. The middleware checks for the `field` you specify, falling back to `content` then `text` if that key is absent.

---

## Error handling

All SDK errors extend `T3Error`, so a single `catch` handles everything.

```js
const { T3Sentinel, T3Error, HallucinationDetected } = require("@t3sentinel/sdk");

try {
  const result = await sentinel.check(aiOutput, { brandId: 4 });
} catch (err) {
  if (err instanceof HallucinationDetected) {
    // Thrown by checkOrThrow() only
    console.log("Bad claims:", err.claims);
    console.log("Corrected:", err.correctedText);
  } else if (err instanceof T3Error) {
    // Network error, timeout, invalid arguments, non-2xx API response
    console.error("Sentinel error:", err.message);
  } else {
    throw err; // unexpected
  }
}
```

**Error scenarios**

| Scenario | Error message |
|----------|---------------|
| Missing API key | `apiKey is required and must be a non-empty string` |
| Missing brandId | `brandId is required and must be a number` |
| Invalid mode | `Invalid mode "…". Must be "block", "flag", or "log"` |
| Text too long | `text exceeds the 10,000 character limit` |
| Request timeout | `Request timed out after 30000ms` |
| Network failure | `Network error: <details>` |
| API returns 4xx/5xx | `API error <status>: <body>` |

---

## Health check

```js
const status = await sentinel.status();
console.log(status.status);                     // "operational"
console.log(status.stats.total_checks);         // 14823
console.log(status.stats.hallucinations_caught); // 341
console.log(status.avg_response_ms);            // 45
```

---

## TypeScript support

Full type declarations are included with the package — no `@types` package needed.

```ts
import { T3Sentinel, T3Error, HallucinationDetected } from "@t3sentinel/sdk";
import type { HDECheckResponse, ClaimResult, CheckMode } from "@t3sentinel/sdk";

const sentinel = new T3Sentinel({ apiKey: process.env.T3_API_KEY! });

const result: HDECheckResponse = await sentinel.check(aiOutput, {
  brandId: 4,
  mode: "flag",
});
```

---

## Environment variables

The SDK reads no environment variables automatically. Pass your API key explicitly to `new T3Sentinel({ apiKey })`. A common pattern is:

```js
const sentinel = new T3Sentinel({
  apiKey: process.env.T3_API_KEY,
  timeout: 10_000, // tighten the timeout for latency-sensitive routes
});
```

---

## License

MIT
