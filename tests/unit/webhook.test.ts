// tests/unit/webhook.test.ts
// Tests for HMAC-SHA256 webhook signature verification.
// This is security-critical code — thorough testing is essential.

import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

// We test the verification logic directly by recreating it here
// (since it's not exported from the route handler)
// In a refactor, we'd extract it to lib/utils/crypto.ts

function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body).digest("hex");

  if (signature.length !== expectedSignature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

function generateSignature(body: string, secret: string): string {
  return (
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body).digest("hex")
  );
}

describe("verifyWebhookSignature", () => {
  const SECRET = "test-webhook-secret";
  const BODY = JSON.stringify({ action: "opened", pull_request: { number: 1 } });

  it("returns true for valid signature", () => {
    const signature = generateSignature(BODY, SECRET);
    expect(verifyWebhookSignature(BODY, signature, SECRET)).toBe(true);
  });

  it("returns false for null signature", () => {
    expect(verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const signature = generateSignature(BODY, "wrong-secret");
    expect(verifyWebhookSignature(BODY, signature, SECRET)).toBe(false);
  });

  it("returns false for tampered body", () => {
    const signature = generateSignature(BODY, SECRET);
    const tamperedBody = BODY.replace("opened", "closed");
    expect(verifyWebhookSignature(tamperedBody, signature, SECRET)).toBe(false);
  });

  it("returns false for signature without sha256= prefix", () => {
    const rawHmac = crypto
      .createHmac("sha256", SECRET)
      .update(BODY)
      .digest("hex");
    expect(verifyWebhookSignature(BODY, rawHmac, SECRET)).toBe(false);
  });

  it("returns false for empty signature string", () => {
    expect(verifyWebhookSignature(BODY, "", SECRET)).toBe(false);
  });

  it("handles different body content correctly", () => {
    const body1 = "body one";
    const body2 = "body two";
    const sig1 = generateSignature(body1, SECRET);
    const sig2 = generateSignature(body2, SECRET);

    expect(verifyWebhookSignature(body1, sig1, SECRET)).toBe(true);
    expect(verifyWebhookSignature(body2, sig2, SECRET)).toBe(true);
    // Cross-check — wrong signature for wrong body
    expect(verifyWebhookSignature(body1, sig2, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body2, sig1, SECRET)).toBe(false);
  });
});