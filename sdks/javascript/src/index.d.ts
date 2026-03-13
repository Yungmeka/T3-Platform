// T3 Sentinel JavaScript SDK — TypeScript declarations
// Version: 0.1.0

export type CheckMode = "block" | "flag" | "log";

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface ClaimResult {
  /** The specific claim that was extracted and evaluated */
  claim: string;
  /** Category of the claim */
  type: "pricing" | "feature" | "availability" | "policy";
  /** Verdict for this claim */
  status: "accurate" | "hallucinated" | "outdated";
  /** Verified correct value from the product catalog, or null if N/A */
  ground_truth: string | null;
  /** Detection confidence between 0 and 1 */
  confidence: number;
  /** Name of the product this claim relates to */
  product?: string;
}

export interface HDECheckResponse {
  /** True when no hallucinations were detected */
  safe: boolean;
  /** The text exactly as submitted */
  original_text: string;
  /**
   * Text with hallucinations replaced by ground truth.
   * Populated only in "block" mode when safe is false.
   */
  corrected_text: string | null;
  /** Total number of factual claims the engine evaluated */
  claims_checked: number;
  /** Number of claims classified as hallucinated or outdated */
  hallucinations_found: number;
  /** Per-claim breakdown */
  claims: ClaimResult[];
  /** The mode that was used for this check */
  mode: string;
  /** What the engine did with the result */
  action_taken:
    | "passed_clean"
    | "response_corrected"
    | "claims_flagged"
    | "silently_logged";
}

export interface HDEStatusStats {
  total_checks: number;
  hallucinations_caught: number;
  claims_checked: number;
  /** ISO 8601 timestamp of when the engine started */
  started_at: string;
}

export interface HDEStatusResponse {
  status: "operational" | "degraded" | "down";
  engine: string;
  version: string;
  stats: HDEStatusStats;
  /** Rolling average response latency in milliseconds */
  avg_response_ms: number;
}

// ---------------------------------------------------------------------------
// Constructor options
// ---------------------------------------------------------------------------

export interface T3SentinelOptions {
  /** Your T3 Sentinel API key, starting with "t3_live_" */
  apiKey: string;
  /**
   * API base URL.
   * @default "https://api.t3tx.com"
   */
  baseUrl?: string;
  /**
   * Per-request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;
}

export interface CheckOptions {
  /**
   * Detection mode.
   *
   * - **block** — Hallucinated claims are replaced with ground truth.
   *   `corrected_text` is populated when `safe` is false.
   * - **flag**  — Original text is returned. `claims` contains flagged items.
   * - **log**   — Check is recorded silently. Original text is returned.
   *
   * @default "block"
   */
  mode?: CheckMode;
  /**
   * Brand ID used to select the product catalog for claim verification.
   * Find yours in the T3 Sentinel dashboard. Required by the API.
   */
  brandId: number;
}

export interface MiddlewareOptions {
  /**
   * JSON body field to read the AI-generated text from.
   * Falls back to "content" then "text" if the named field is absent.
   * @default "response"
   */
  field?: string;
  /**
   * Detection mode applied to the extracted text.
   * @default "block"
   */
  mode?: CheckMode;
  /**
   * Brand ID forwarded to the check endpoint. Required.
   */
  brandId: number;
}

// ---------------------------------------------------------------------------
// Middleware summary attached to corrected response bodies
// ---------------------------------------------------------------------------

export interface SentinelBodyMetadata {
  safe: false;
  hallucinations_found: number;
  action_taken: string;
  claims: ClaimResult[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Base error class for all SDK errors (network failures, invalid arguments,
 * non-2xx API responses, timeouts).
 */
export class T3Error extends Error {
  name: "T3Error";
  constructor(message: string);
}

/**
 * Thrown by {@link T3Sentinel.checkOrThrow} when hallucinations are detected.
 * Extends {@link T3Error} so a single `catch (err)` handles both cases.
 */
export class HallucinationDetected extends T3Error {
  name: "HallucinationDetected";
  /** Full API response that triggered the error */
  result: HDECheckResponse;
  /** Shorthand for result.claims */
  claims: ClaimResult[];
  /** Shorthand for result.corrected_text */
  correctedText: string | null;
  constructor(result: HDECheckResponse);
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------

export class T3Sentinel {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeout: number;

  /**
   * Create a new T3 Sentinel client.
   *
   * @example
   * const sentinel = new T3Sentinel({ apiKey: "t3_live_abc123" });
   */
  constructor(options: T3SentinelOptions);

  /**
   * Check AI-generated text for hallucinations against verified product data.
   *
   * @example
   * const result = await sentinel.check(aiOutput, { brandId: 4, mode: "block" });
   * if (!result.safe) {
   *   console.log("Corrected:", result.corrected_text);
   * }
   */
  check(text: string, options: CheckOptions): Promise<HDECheckResponse>;

  /**
   * Run a hallucination check and return the safe text.
   *
   * Returns `corrected_text` when hallucinations are found in block mode,
   * otherwise returns the original text unchanged.
   *
   * @example
   * const safeText = await sentinel.checkOrCorrect(aiOutput, 4);
   * res.json({ response: safeText });
   */
  checkOrCorrect(text: string, brandId: number): Promise<string>;

  /**
   * Run a check and throw {@link HallucinationDetected} if hallucinations are found.
   *
   * @example
   * try {
   *   await sentinel.checkOrThrow(aiOutput, { brandId: 4 });
   * } catch (err) {
   *   if (err instanceof HallucinationDetected) {
   *     console.log(err.correctedText);
   *   }
   * }
   */
  checkOrThrow(text: string, options: CheckOptions): Promise<HDECheckResponse>;

  /**
   * Wrap an OpenAI client so every chat completion is automatically checked.
   *
   * `choice.message.content` is replaced in place when a correction is made.
   * `choice.message._sentinel` contains the full {@link HDECheckResponse}.
   *
   * @example
   * const guarded = sentinel.wrapOpenAI(new OpenAI(), 4);
   * const res = await guarded.chat.completions.create({ ... });
   */
  wrapOpenAI<T extends object>(openaiClient: T, brandId: number, mode?: CheckMode): T;

  /**
   * Wrap an Anthropic client so every message response is automatically checked.
   *
   * `block.text` is replaced in place when a correction is made.
   * `block._sentinel` contains the full {@link HDECheckResponse}.
   *
   * @example
   * const guarded = sentinel.wrapAnthropic(new Anthropic(), 4);
   * const msg = await guarded.messages.create({ ... });
   */
  wrapAnthropic<T extends object>(anthropicClient: T, brandId: number, mode?: CheckMode): T;

  /**
   * Express/Fastify middleware that auto-checks JSON response bodies.
   *
   * When a correction is made the body gains a `_sentinel` field of type
   * {@link SentinelBodyMetadata} so clients can see what changed.
   *
   * If the Sentinel API is unavailable, the error is logged and the original
   * response is sent unchanged — the middleware never blocks your response.
   *
   * @example
   * app.use("/api/chat", sentinel.middleware({ brandId: 4, field: "response" }));
   */
  middleware(options: MiddlewareOptions): (
    req: object,
    res: object,
    next: () => void
  ) => Promise<void>;

  /**
   * Fetch current HDE API health and usage statistics.
   *
   * @example
   * const status = await sentinel.status();
   * console.log(status.status); // "operational"
   */
  status(): Promise<HDEStatusResponse>;
}
