"use strict";

const { T3Error, HallucinationDetected } = require("./exceptions");

/**
 * @typedef {Object} ClaimResult
 * @property {string} claim - The specific claim that was evaluated
 * @property {string} type - Claim category: "pricing" | "feature" | "availability" | "policy"
 * @property {string} status - Verdict: "accurate" | "hallucinated" | "outdated"
 * @property {string | null} ground_truth - Verified correct value from product data
 * @property {number} confidence - Detection confidence score between 0 and 1
 * @property {string} [product] - Product name the claim relates to
 */

/**
 * @typedef {Object} HDECheckResponse
 * @property {boolean} safe - True when no hallucinations were detected
 * @property {string} original_text - The text as submitted
 * @property {string | null} corrected_text - Text with hallucinations replaced (block mode only)
 * @property {number} claims_checked - Total number of factual claims evaluated
 * @property {number} hallucinations_found - Number of inaccurate or outdated claims found
 * @property {ClaimResult[]} claims - Per-claim breakdown
 * @property {string} mode - The mode used for this check
 * @property {string} action_taken - What the engine did: "passed_clean" | "response_corrected" | "claims_flagged" | "silently_logged"
 */

/**
 * @typedef {Object} HDEStatusResponse
 * @property {string} status - Service health: "operational" | "degraded" | "down"
 * @property {string} engine - Engine identifier
 * @property {string} version - API version string
 * @property {{ total_checks: number, hallucinations_caught: number, claims_checked: number, started_at: string }} stats
 * @property {number} avg_response_ms - Rolling average response latency in milliseconds
 */

/**
 * @typedef {"block" | "flag" | "log"} CheckMode
 *
 * - block: Hallucinated claims are replaced with ground truth before the response
 *          is returned. `corrected_text` will be populated when `safe` is false.
 * - flag:  Original text is returned unchanged. `claims` contains the flagged items
 *          so your code can decide what to do.
 * - log:   Check is recorded for analytics. Original text is returned, no flags raised.
 */

/**
 * @typedef {Object} CheckOptions
 * @property {CheckMode} [mode="block"] - Detection mode
 * @property {number} brandId - Brand ID used to look up verified product data.
 *   This is required by the API. Obtain it from your T3 Sentinel dashboard.
 */

/**
 * @typedef {Object} MiddlewareOptions
 * @property {string} [field="response"] - Body key to extract text from. Falls back to "content" then "text".
 * @property {CheckMode} [mode="block"] - Detection mode applied to the extracted text.
 * @property {number} brandId - Brand ID forwarded to the check endpoint.
 */

// ---------------------------------------------------------------------------
// T3Sentinel client
// ---------------------------------------------------------------------------

class T3Sentinel {
  /**
   * Create a new T3 Sentinel client.
   *
   * @param {Object} options
   * @param {string} options.apiKey - Your T3 Sentinel API key (t3_live_xxx)
   * @param {string} [options.baseUrl="https://api.t3tx.com"] - API base URL
   * @param {number} [options.timeout=30000] - Per-request timeout in milliseconds
   *
   * @example
   * const sentinel = new T3Sentinel({ apiKey: "t3_live_abc123" });
   */
  constructor({ apiKey, baseUrl = "https://api.t3tx.com", timeout = 30000 } = {}) {
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      throw new T3Error("apiKey is required and must be a non-empty string");
    }

    /** @type {string} */
    this.apiKey = apiKey;
    /** @type {string} */
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    /** @type {number} */
    this.timeout = timeout;
  }

  // -------------------------------------------------------------------------
  // Core check method
  // -------------------------------------------------------------------------

  /**
   * Check AI-generated text for hallucinations against verified product data.
   *
   * The `brandId` ties the check to a specific brand's product catalog so the
   * engine knows which ground-truth facts to use. You can find your brand ID
   * in the T3 Sentinel dashboard.
   *
   * @param {string} text - AI-generated text to verify (1–10,000 characters)
   * @param {CheckOptions} options
   * @returns {Promise<HDECheckResponse>}
   *
   * @example
   * const result = await sentinel.check(aiOutput, { brandId: 4, mode: "block" });
   * if (!result.safe) {
   *   console.log("Corrected:", result.corrected_text);
   *   console.log("Claims:", result.claims);
   * }
   */
  async check(text, { mode = "block", brandId } = {}) {
    if (typeof text !== "string" || text.length === 0) {
      throw new T3Error("text must be a non-empty string");
    }
    if (text.length > 10_000) {
      throw new T3Error("text exceeds the 10,000 character limit");
    }
    if (!["block", "flag", "log"].includes(mode)) {
      throw new T3Error(`Invalid mode "${mode}". Must be "block", "flag", or "log"`);
    }
    if (brandId == null || typeof brandId !== "number") {
      throw new T3Error("brandId is required and must be a number");
    }

    const payload = { text, mode, brand_id: brandId };

    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/hde/check`, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch (err) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new T3Error(`Request timed out after ${this.timeout}ms`);
      }
      throw new T3Error(`Network error: ${err.message}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new T3Error(`API error ${response.status}: ${body}`);
    }

    /** @type {HDECheckResponse} */
    const result = await response.json();
    return result;
  }

  // -------------------------------------------------------------------------
  // Convenience helpers
  // -------------------------------------------------------------------------

  /**
   * Run a hallucination check and return the safe text regardless of outcome.
   *
   * When hallucinations are detected in block mode the engine returns a
   * corrected version of the text. This method surfaces that corrected text
   * automatically, falling back to the original when everything is clean.
   *
   * @param {string} text - AI-generated text to verify
   * @param {number} brandId - Brand ID for product catalog lookup
   * @returns {Promise<string>} Safe text (corrected or original)
   *
   * @example
   * const safeText = await sentinel.checkOrCorrect(aiOutput, 4);
   * res.json({ response: safeText });
   */
  async checkOrCorrect(text, brandId) {
    const result = await this.check(text, { mode: "block", brandId });
    return result.corrected_text ?? text;
  }

  /**
   * Run a check and throw {@link HallucinationDetected} if hallucinations are found.
   *
   * Useful when you want to halt execution and handle the problem in a catch block
   * rather than branching on the result object.
   *
   * @param {string} text - AI-generated text to verify
   * @param {CheckOptions} options
   * @returns {Promise<HDECheckResponse>}
   * @throws {HallucinationDetected} When `safe` is false
   *
   * @example
   * try {
   *   await sentinel.checkOrThrow(aiOutput, { brandId: 4 });
   * } catch (err) {
   *   if (err instanceof HallucinationDetected) {
   *     console.log("Caught hallucinations:", err.claims);
   *   }
   * }
   */
  async checkOrThrow(text, options = {}) {
    const result = await this.check(text, options);
    if (!result.safe) {
      throw new HallucinationDetected(result);
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // AI client wrappers
  // -------------------------------------------------------------------------

  /**
   * Wrap an OpenAI client so every chat completion is automatically checked
   * for hallucinations before your code receives the response.
   *
   * When hallucinations are found in block mode the `message.content` field
   * is silently replaced with the corrected text. A `_sentinel` property is
   * attached to the message object with the full detection metadata.
   *
   * @param {Object} openaiClient - An initialised `openai` package client instance
   * @param {number} brandId - Brand ID forwarded to each check
   * @param {CheckMode} [mode="block"] - Detection mode
   * @returns {Object} The same client instance with `chat.completions.create` patched
   *
   * @example
   * import OpenAI from "openai";
   * import { T3Sentinel } from "@t3sentinel/sdk";
   *
   * const openai = new OpenAI();
   * const sentinel = new T3Sentinel({ apiKey: "t3_live_xxx" });
   * const guarded = sentinel.wrapOpenAI(openai, 4);
   *
   * const response = await guarded.chat.completions.create({
   *   model: "gpt-4o",
   *   messages: [{ role: "user", content: "Tell me about Product X" }],
   * });
   * // response.choices[0].message.content is already safe
   */
  wrapOpenAI(openaiClient, brandId, mode = "block") {
    if (!openaiClient?.chat?.completions?.create) {
      throw new T3Error(
        "openaiClient does not look like an OpenAI instance. " +
        "Pass an initialised OpenAI() client."
      );
    }
    if (brandId == null || typeof brandId !== "number") {
      throw new T3Error("brandId is required when wrapping an OpenAI client");
    }

    const sentinel = this;
    const original = openaiClient.chat.completions.create.bind(openaiClient.chat.completions);

    openaiClient.chat.completions.create = async function (params) {
      const response = await original(params);

      for (const choice of response.choices ?? []) {
        const content = choice.message?.content;
        if (typeof content === "string" && content.length > 0) {
          try {
            const result = await sentinel.check(content, { mode, brandId });
            if (!result.safe && result.corrected_text) {
              choice.message.content = result.corrected_text;
              choice.message._sentinel = result;
            }
          } catch (err) {
            // Surface the error but do not swallow the LLM response
            console.error("[T3 Sentinel] check failed for choice:", err.message);
          }
        }
      }

      return response;
    };

    return openaiClient;
  }

  /**
   * Wrap an Anthropic client so every message response is automatically checked
   * for hallucinations before your code receives it.
   *
   * Text blocks in `response.content` are checked and corrected in place.
   * A `_sentinel` property is attached to each corrected block with metadata.
   *
   * @param {Object} anthropicClient - An initialised `@anthropic-ai/sdk` client instance
   * @param {number} brandId - Brand ID forwarded to each check
   * @param {CheckMode} [mode="block"] - Detection mode
   * @returns {Object} The same client instance with `messages.create` patched
   *
   * @example
   * import Anthropic from "@anthropic-ai/sdk";
   * import { T3Sentinel } from "@t3sentinel/sdk";
   *
   * const anthropic = new Anthropic();
   * const sentinel = new T3Sentinel({ apiKey: "t3_live_xxx" });
   * const guarded = sentinel.wrapAnthropic(anthropic, 4);
   *
   * const message = await guarded.messages.create({
   *   model: "claude-opus-4-6",
   *   max_tokens: 1024,
   *   messages: [{ role: "user", content: "Tell me about Product X" }],
   * });
   * // message.content[0].text is already safe
   */
  wrapAnthropic(anthropicClient, brandId, mode = "block") {
    if (!anthropicClient?.messages?.create) {
      throw new T3Error(
        "anthropicClient does not look like an Anthropic instance. " +
        "Pass an initialised Anthropic() client."
      );
    }
    if (brandId == null || typeof brandId !== "number") {
      throw new T3Error("brandId is required when wrapping an Anthropic client");
    }

    const sentinel = this;
    const original = anthropicClient.messages.create.bind(anthropicClient.messages);

    anthropicClient.messages.create = async function (params) {
      const response = await original(params);

      for (const block of response.content ?? []) {
        if (block.type === "text" && typeof block.text === "string" && block.text.length > 0) {
          try {
            const result = await sentinel.check(block.text, { mode, brandId });
            if (!result.safe && result.corrected_text) {
              block.text = result.corrected_text;
              block._sentinel = result;
            }
          } catch (err) {
            console.error("[T3 Sentinel] check failed for content block:", err.message);
          }
        }
      }

      return response;
    };

    return anthropicClient;
  }

  // -------------------------------------------------------------------------
  // Express / Fastify middleware
  // -------------------------------------------------------------------------

  /**
   * Returns an Express/Fastify-compatible middleware function that intercepts
   * `res.json()` calls, extracts the AI-generated text from the response body,
   * runs it through Sentinel, and (in block mode) replaces it with corrected
   * text before the response is sent to the client.
   *
   * The middleware attaches a `_sentinel` summary object to the body when a
   * correction is made so downstream consumers can inspect what changed.
   *
   * If the Sentinel API is unreachable the error is logged and the original
   * response is sent unchanged — the middleware is designed to be non-blocking.
   *
   * @param {MiddlewareOptions} options
   * @returns {Function} Express-compatible `(req, res, next) => void` middleware
   *
   * @example
   * import express from "express";
   * import { T3Sentinel } from "@t3sentinel/sdk";
   *
   * const app = express();
   * const sentinel = new T3Sentinel({ apiKey: "t3_live_xxx" });
   *
   * // Protect a single route
   * app.use("/api/chat", sentinel.middleware({ brandId: 4, field: "response" }));
   *
   * // Or protect the whole app
   * app.use(sentinel.middleware({ brandId: 4 }));
   */
  middleware({ field = "response", mode = "block", brandId } = {}) {
    if (brandId == null || typeof brandId !== "number") {
      throw new T3Error("brandId is required when creating Sentinel middleware");
    }

    const sentinel = this;

    return async function t3SentinelMiddleware(req, res, next) {
      const originalJson = res.json.bind(res);

      res.json = async function (body) {
        if (body !== null && typeof body === "object") {
          // Resolve the text field in priority order
          const text =
            typeof body[field] === "string" ? body[field] :
            typeof body.content === "string" ? body.content :
            typeof body.text === "string" ? body.text :
            null;

          if (text && text.length > 0) {
            try {
              const result = await sentinel.check(text, { mode, brandId });
              if (!result.safe && result.corrected_text) {
                // Patch the field that contained the text
                const targetField =
                  typeof body[field] === "string" ? field :
                  typeof body.content === "string" ? "content" :
                  "text";

                body[targetField] = result.corrected_text;
                body._sentinel = {
                  safe: false,
                  hallucinations_found: result.hallucinations_found,
                  action_taken: result.action_taken,
                  claims: result.claims,
                };
              }
            } catch (err) {
              // Never block the response if Sentinel is unavailable
              console.error("[T3 Sentinel] Middleware check failed:", err.message);
            }
          }
        }

        return originalJson(body);
      };

      next();
    };
  }

  // -------------------------------------------------------------------------
  // Status / health
  // -------------------------------------------------------------------------

  /**
   * Fetch current HDE API health and usage statistics.
   *
   * @returns {Promise<HDEStatusResponse>}
   *
   * @example
   * const status = await sentinel.status();
   * console.log(status.status); // "operational"
   * console.log(status.stats.total_checks);
   */
  async status() {
    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/hde/status`, {
        headers: { "X-API-Key": this.apiKey },
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch (err) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new T3Error(`Status request timed out after ${this.timeout}ms`);
      }
      throw new T3Error(`Network error: ${err.message}`);
    }

    if (!response.ok) {
      throw new T3Error(`Status check failed with HTTP ${response.status}`);
    }

    return response.json();
  }
}

module.exports = { T3Sentinel };
