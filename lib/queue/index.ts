// lib/queue/index.ts
// BullMQ queue setup for background PR review jobs.
//
// How the queue works:
//   1. Webhook handler receives a PR event from GitHub
//   2. Webhook handler calls reviewQueue.add() to push a job here
//   3. Webhook handler responds 200 to GitHub immediately
//   4. A separate worker process picks up the job and does the
//      actual heavy work (fetching diff, calling AI, posting comments)
//
// This decoupling is what lets us respond to GitHub in milliseconds
// while taking minutes to actually process the review.

import { Queue } from "bullmq";
import type { ReviewJobPayload } from "@/types";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set");
}

// The queue — a named channel in Redis where jobs accumulate
// until a worker picks them up
export const reviewQueue = new Queue<ReviewJobPayload>("review-pr", {
  connection: {
    url: process.env.REDIS_URL,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    // Explicitly enable TLS for Upstash
    // ECONNRESET errors occur when TLS is required but not configured
    tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Log queue-level errors (not job errors — those are handled in the worker)
reviewQueue.on("error", (error) => {
  console.error("Review queue error:", error);
});