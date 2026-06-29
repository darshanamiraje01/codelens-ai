// BullMQ worker that processes PR review jobs.
//
// This runs as a SEPARATE process from Next.js (see workers/index.ts).
// It watches the "review-pr" queue in Redis and processes jobs one by one.
//
// Current implementation (Week 4):
//   - Picks up job from queue
//   - Authenticates with GitHub as our App
//   - Fetches PR diff and file list
//   - Stores a Review record in PostgreSQL
//   - Logs the diff (AI analysis slotted in Week 5)
//
// Week 5 will add:
//   - Diff chunking
//   - Gemini AI analysis
//   - Finding storage
//   - Inline comment posting

import { Worker, Job } from "bullmq";
import prisma from "@/lib/db";
import { getPRDiff, getPRFiles, getPRDetails, parseRepoFullName } from "@/lib/github/client";
import type { ReviewJobPayload } from "@/types";

// ─── Worker Configuration ─────────────────────────────────────────────────────

const QUEUE_NAME = "review-pr";

// How many jobs to process simultaneously
// We start with 1 to keep things simple and debuggable
// Can be increased later once the AI pipeline is stable
const CONCURRENCY = 1;

// ─── Job Processor ────────────────────────────────────────────────────────────

async function processReviewJob(job: Job<ReviewJobPayload>): Promise<void> {
  const {
    installationId,
    repoFullName,
    prNumber,
    prTitle,
    prAuthor,
    commitSha,
  } = job.data;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing review job: ${job.id}`);
  console.log(`Repository: ${repoFullName}`);
  console.log(`PR #${prNumber}: ${prTitle}`);
  console.log(`Author: ${prAuthor}`);
  console.log(`Commit: ${commitSha}`);
  console.log(`${"=".repeat(60)}\n`);

  const startTime = Date.now();
  const { owner, repo } = parseRepoFullName(repoFullName);

  // ─── Step 1: Find the repository in our database ──────────────────────────
  // The repository must exist in our DB (created when the GitHub App
  // was installed). If it doesn't exist, something went wrong with
  // the installation webhook — we throw so BullMQ retries the job.
  const repository = await prisma.repository.findUnique({
    where: { githubRepoId: -1 }, // placeholder — we'll fix this below
  });

  // For now, find by fullName since we may not have githubRepoId yet
  const repoRecord = await prisma.repository.findFirst({
    where: { fullName: repoFullName },
  });

  // If repo not found, we create a placeholder — in Week 3 Task 10
  // (installation webhook handler) we'll create this properly.
  // For now this lets us test the worker without that handler.
  let repositoryId: string;

  if (!repoRecord) {
    console.log(`Repository ${repoFullName} not in DB yet — creating placeholder`);
    const newRepo = await prisma.repository.create({
      data: {
        githubRepoId: Math.floor(Math.random() * 1000000), // temp
        fullName: repoFullName,
        isActive: true,
        settings: {},
        installation: {
          create: {
            installationId,
            accountLogin: owner,
            accountType: "USER",
            owner: {
              connectOrCreate: {
                where: { githubId: 0 }, // temp placeholder
                create: {
                  githubId: 0,
                  githubLogin: owner,
                  avatarUrl: "",
                  plan: "FREE",
                },
              },
            },
          },
        },
      },
    });
    repositoryId = newRepo.id;
  } else {
    repositoryId = repoRecord.id;
  }

  // ─── Step 2: Create a Review record in the database ───────────────────────
  // Status starts as PROCESSING — we'll update to COMPLETED or FAILED
  // when the job finishes. This lets the dashboard show real-time status.
  const review = await prisma.review.create({
    data: {
      repositoryId,
      prNumber,
      prTitle,
      prAuthor,
      commitSha,
      status: "PROCESSING",
    },
  });

  console.log(`✓ Created review record: ${review.id}`);

  try {
    // ─── Step 3: Fetch PR data from GitHub ──────────────────────────────────
    console.log("Fetching PR details from GitHub...");

    const [prDetails, prFiles, prDiff] = await Promise.all([
      getPRDetails(installationId, owner, repo, prNumber),
      getPRFiles(installationId, owner, repo, prNumber),
      getPRDiff(installationId, owner, repo, prNumber),
    ]);

    console.log(`✓ Fetched PR details`);
    console.log(`✓ Files changed: ${prFiles.length}`);
    console.log(`✓ Diff size: ${prDiff.length} characters`);

    // Log which files changed — useful for debugging
    prFiles.forEach((file) => {
      console.log(
        `  ${file.status.padEnd(10)} ${file.filename} (+${file.additions} -${file.deletions})`
      );
    });

    // ─── Step 4: Update review with file count ───────────────────────────────
    await prisma.review.update({
      where: { id: review.id },
      data: {
        filesReviewed: prFiles.length,
      },
    });

    // ─── Step 5: AI Analysis placeholder ────────────────────────────────────
    // Week 5 will replace this section with:
    //   - Diff chunking (split large diffs into AI-sized pieces)
    //   - Gemini API calls for each chunk
    //   - Finding storage in the findings table
    //   - Inline comment posting on GitHub
    console.log("\n⏳ AI analysis not yet implemented (coming Week 5)");
    console.log("Diff preview (first 500 chars):");
    console.log(prDiff.substring(0, 500));
    console.log("...\n");

    // ─── Step 6: Mark review as completed ───────────────────────────────────
    const durationMs = Date.now() - startTime;
    await prisma.review.update({
      where: { id: review.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        durationMs,
        summary: `Reviewed ${prFiles.length} files. AI analysis coming soon.`,
      },
    });

    console.log(`✓ Review completed in ${durationMs}ms`);

  } catch (error) {
    // ─── Error handling ──────────────────────────────────────────────────────
    // If anything goes wrong after creating the review record,
    // mark it as FAILED in the DB so the dashboard can show the error.
    // BullMQ will also retry the job based on our queue config (3 attempts).
    console.error("Review job failed:", error);

    await prisma.review.update({
      where: { id: review.id },
      data: { status: "FAILED" },
    });

    // Re-throw so BullMQ knows the job failed and should retry
    throw error;
  }
}

// ─── Worker Setup ─────────────────────────────────────────────────────────────

export function createReviewWorker() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const worker = new Worker<ReviewJobPayload>(
    QUEUE_NAME,
    processReviewJob,
    {
      connection: {
        url: process.env.REDIS_URL,
        maxRetriesPerRequest: null as null,
        enableReadyCheck: false,
      },
      concurrency: CONCURRENCY,
    }
  );

  // ─── Worker Event Handlers ─────────────────────────────────────────────────
  worker.on("completed", (job) => {
    console.log(`✓ Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, error) => {
    console.error(`✗ Job ${job?.id} failed:`, error.message);
    console.error(`  Attempts: ${job?.attemptsMade}/${job?.opts.attempts}`);
  });

  worker.on("error", (error) => {
    console.error("Worker error:", error);
  });

  console.log(`Worker started — listening on queue: ${QUEUE_NAME}`);
  return worker;
}