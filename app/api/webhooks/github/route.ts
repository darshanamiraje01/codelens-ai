// app/api/webhooks/github/route.ts
// Receives GitHub webhook events for our GitHub App.
//
// Security: every request is verified using HMAC-SHA256 before
// any processing happens. This proves the request genuinely came
// from GitHub and wasn't forged by an attacker.
//
// Speed: GitHub expects a response within 10 seconds or it considers
// the delivery failed and will retry. We do minimal work here and
// will push heavy processing (AI review) onto a background queue
// in a later task.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export async function POST(request: NextRequest) {
  // ─── Step 1: Read the raw request body ─────────────────────────────────────
  // We need the RAW (unparsed) body text for signature verification —
  // HMAC is computed over the exact bytes GitHub sent. If we parsed
  // to JSON first and re-serialized, formatting differences could
  // cause valid signatures to fail.
  const rawBody = await request.text();

  // ─── Step 2: Verify the HMAC-SHA256 signature ──────────────────────────────
  const signature = request.headers.get("x-hub-signature-256");
  const isValid = await verifyWebhookSignature(
    rawBody,
    signature,
    process.env.GITHUB_WEBHOOK_SECRET!
  );

  if (!isValid) {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ─── Step 3: Identify the event type ───────────────────────────────────────
  // GitHub sends the event type in a header, not the body.
  const eventType = request.headers.get("x-github-event");

  // ─── Step 4: Parse the JSON payload ────────────────────────────────────────
  const payload = JSON.parse(rawBody);

  // ─── Step 5: Log what we received (temporary — proves the pipeline works) ──
  console.log("=== WEBHOOK RECEIVED ===");
  console.log("Event type:", eventType);
  console.log("Action:", payload.action);
  console.log("Repository:", payload.repository?.full_name);
  if (eventType === "pull_request") {
    console.log("PR number:", payload.pull_request?.number);
    console.log("PR title:", payload.pull_request?.title);
  }

  // ─── Step 6: Respond immediately ───────────────────────────────────────────
  // We MUST respond quickly. Heavy processing (queueing, AI calls)
  // will be added in upcoming tasks — never done synchronously here.
  return NextResponse.json({ received: true }, { status: 200 });
}

// ─── HMAC-SHA256 Signature Verification ──────────────────────────────────────
//
// GitHub signs every webhook payload using a secret only we share with it.
// The signature arrives in the x-hub-signature-256 header, formatted as:
//   sha256=<hex-encoded-hmac>
//
// We recompute the same HMAC ourselves using our copy of the secret,
// then compare. If they match, the request is authentic.
//
// We use crypto.timingSafeEqual() instead of === for the comparison.
// A normal string comparison (===) short-circuits on the first
// mismatched character, which means comparison time varies based on
// how many characters match. An attacker could theoretically measure
// these timing differences to guess the correct signature one byte
// at a time. timingSafeEqual() always takes the same amount of time
// regardless of where the mismatch occurs, eliminating this attack vector.
async function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body).digest("hex");

  // Both buffers must be the same length for timingSafeEqual to work
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}