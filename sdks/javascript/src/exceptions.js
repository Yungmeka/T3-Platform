"use strict";

/**
 * Base error class for all T3 Sentinel SDK errors.
 */
class T3Error extends Error {
  /**
   * @param {string} message - Human-readable error description
   */
  constructor(message) {
    super(message);
    this.name = "T3Error";
    // Restore correct prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when hallucinations are detected and the caller wants to
 * handle the detection event explicitly rather than receive a result object.
 */
class HallucinationDetected extends T3Error {
  /**
   * @param {import('./client').HDECheckResponse} result - Full check result from the API
   */
  constructor(result) {
    super(`Found ${result.hallucinations_found ?? 0} hallucination(s)`);
    this.name = "HallucinationDetected";
    /** @type {import('./client').HDECheckResponse} */
    this.result = result;
    /** @type {import('./client').ClaimResult[]} */
    this.claims = result.claims ?? [];
    /** @type {string | null} */
    this.correctedText = result.corrected_text ?? null;
  }
}

module.exports = { T3Error, HallucinationDetected };
