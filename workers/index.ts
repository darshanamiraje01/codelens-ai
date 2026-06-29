// workers/index.ts
// Entry point for the BullMQ worker process.
//
// This file is run as a standalone Node.js process — separate from
// the Next.js dev server. Start it with: npm run worker
//
// In production, this would run as a separate service (e.g. a separate
// Railway service alongside the Next.js app service).
//
// Environment setup: we use dotenv to load .env.local since this
// process doesn't go through Next.js (which normally handles env loading).

import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables BEFORE importing anything that uses them
// The path must be absolute to work regardless of where the script is run from
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

import { createReviewWorker } from "@/lib/queue/workers/review.worker";

console.log("Starting CodeLens AI worker process...");
console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
console.log(`Redis URL: ${process.env.REDIS_URL ? "configured ✓" : "MISSING ✗"}`);
console.log(`Database URL: ${process.env.DATABASE_URL ? "configured ✓" : "MISSING ✗"}`);
console.log(`GitHub App ID: ${process.env.GITHUB_APP_ID ? "configured ✓" : "MISSING ✗"}`);

// Start the worker
const worker = createReviewWorker();

// Graceful shutdown — when the process receives SIGTERM or SIGINT
// (Ctrl+C or deployment system stopping the process), wait for the
// current job to finish before exiting rather than killing it mid-review
async function shutdown() {
  console.log("\nShutdown signal received — waiting for current job to finish...");
  await worker.close();
  console.log("Worker shut down gracefully");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);