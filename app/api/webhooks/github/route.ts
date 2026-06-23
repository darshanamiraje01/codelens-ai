// app/api/webhooks/github/route.ts
// Receives GitHub webhook events for our GitHub App.
//
// Design principle: do as little work as possible here.
// Verify the signature, parse the payload, push to queue, respond.
// All heavy processing happens in the background worker.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { reviewQueue } from "@/lib/queue";
import type { ReviewJobPayload } from "@/types";

// Actions that should trigger a code review
const TRIGGER_ACTIONS = ["opened", "synchronize", "reopened"] as const;

export async function POST(request: NextRequest) {
  // ─── Step 1: Read raw body for HMAC verification ───────────────────────────
  const rawBody = await request.text();

  // ─── Step 2: Verify HMAC-SHA256 signature ──────────────────────────────────
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

  // ─── Step 3: Identify event type ───────────────────────────────────────────
  const eventType = request.headers.get("x-github-event");

  // ─── Step 4: Parse payload ─────────────────────────────────────────────────
  const payload = JSON.parse(rawBody);

  // ─── Step 5: Filter — only process pull_request events ─────────────────────
  if (eventType !== "pull_request") {
    // We subscribed only to pull_request events in GitHub App settings,
    // but GitHub also sends a "ping" event when you first configure
    // the webhook — we silently accept everything else with 200
    console.log(`Ignoring event type: ${eventType}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ─── Step 6: Filter — only trigger on relevant PR actions ──────────────────
  const action = payload.action as string;
  if (!TRIGGER_ACTIONS.includes(action as typeof TRIGGER_ACTIONS[number])) {
    // Actions like "closed", "labeled", "assigned" don't need review
    console.log(`Ignoring pull_request action: ${action}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ─── Step 7: Build the job payload ─────────────────────────────────────────
  const jobPayload: ReviewJobPayload = {
    installationId: payload.installation?.id,
    repoFullName: payload.repository.full_name,
    prNumber: payload.pull_request.number,
    prTitle: payload.pull_request.title,
    prAuthor: payload.pull_request.user.login,
    commitSha: payload.pull_request.head.sha,
    diffUrl: payload.pull_request.diff_url,
  };

  // ─── Step 8: Push to queue ─────────────────────────────────────────────────
  // This is fast — just a Redis write, not actual processing
  const job = await reviewQueue.add("review-pr", jobPayload, {
    // Use repo+PR+commit as a deduplication key — if the exact same
    // commit fires multiple webhooks (e.g. GitHub retries), we won't
    // process it twice
    jobId: `${jobPayload.repoFullName}-${jobPayload.prNumber}-${jobPayload.commitSha}`,
  });

  console.log(`✓ Queued review job ${job.id} for PR #${jobPayload.prNumber} in ${jobPayload.repoFullName}`);

  // ─── Step 9: Respond immediately ───────────────────────────────────────────
  return NextResponse.json(
    { received: true, jobId: job.id },
    { status: 200 }
  );
}

// ─── HMAC-SHA256 Signature Verification ──────────────────────────────────────
async function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body).digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}