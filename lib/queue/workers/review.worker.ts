// lib/queue/workers/review.worker.ts
// BullMQ worker that processes PR review jobs.
//
// Week 5 additions:
//   - Diff chunking (split large diffs into AI-sized pieces)
//   - Gemini AI analysis per chunk
//   - Finding storage in PostgreSQL
//   - Inline comment posting on GitHub PR
//   - Summary comment on PR

import { Worker, Job } from "bullmq";
import prisma from "@/lib/db";
import {
  getPRDiff,
  getPRFiles,
  getPRDetails,
  postInlineComment,
  postPRComment,
  parseRepoFullName,
} from "@/lib/github/client";
import { chunkDiff } from "@/lib/ai/chunker";
import { reviewAllChunks } from "@/lib/ai/gemini";
import { buildSummaryComment } from "@/lib/ai/prompts";
import type { ReviewJobPayload } from "@/types";

const QUEUE_NAME = "review-pr";
const CONCURRENCY = 1;

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

  // ─── Step 1: Find or create repository record ──────────────────────────────
  let repoRecord = await prisma.repository.findFirst({
    where: { fullName: repoFullName },
  });

  if (!repoRecord) {
    console.log(`Repository ${repoFullName} not in DB — creating placeholder`);
    repoRecord = await prisma.repository.create({
      data: {
        githubRepoId: Math.floor(Math.random() * 1000000),
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
                where: { githubId: 0 },
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
  }

  // ─── Step 2: Create review record ─────────────────────────────────────────
  const review = await prisma.review.create({
    data: {
      repositoryId: repoRecord.id,
      prNumber,
      prTitle,
      prAuthor,
      commitSha,
      status: "PROCESSING",
    },
  });

  console.log(`✓ Created review record: ${review.id}`);

  try {
    // ─── Step 3: Fetch PR data from GitHub ────────────────────────────────────
    console.log("Fetching PR data from GitHub...");

    const [prDetails, prFiles, prDiff] = await Promise.all([
      getPRDetails(installationId, owner, repo, prNumber),
      getPRFiles(installationId, owner, repo, prNumber),
      getPRDiff(installationId, owner, repo, prNumber),
    ]);

    console.log(`✓ Files changed: ${prFiles.length}`);
    console.log(`✓ Diff size: ${prDiff.length} characters`);

    // ─── Step 4: Chunk the diff ───────────────────────────────────────────────
    console.log("\nChunking diff for AI review...");
    const chunks = chunkDiff(prDiff);
    console.log(`✓ Created ${chunks.length} chunks for review`);

    if (chunks.length === 0) {
      console.log("No reviewable chunks found — marking as completed");
      await prisma.review.update({
        where: { id: review.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          filesReviewed: prFiles.length,
          summary: "No reviewable code changes found in this PR.",
          overallScore: 100,
        },
      });
      return;
    }

    // ─── Step 5: Send chunks to Gemini AI ────────────────────────────────────
    console.log("\nSending chunks to Gemini AI...");
    const prDescription = prDetails.body ?? "No description provided";

    const { findings, summaries, scores } = await reviewAllChunks(
      chunks,
      prDescription
    );

    console.log(`\n✓ AI review complete`);
    console.log(`  Total findings: ${findings.length}`);
    console.log(`  Chunks reviewed: ${chunks.length}`);

    // Calculate overall score as average of chunk scores
    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 100;

    // Combine summaries into one
    const combinedSummary = summaries.join(" ").substring(0, 500);

    // ─── Step 6: Store findings in PostgreSQL ─────────────────────────────────
    console.log("\nStoring findings in database...");

    if (findings.length > 0) {
      await prisma.finding.createMany({
        data: findings.map((f) => ({
          reviewId: review.id,
          filePath: f.filePath,
          lineStart: f.lineStart,
          lineEnd: f.lineEnd,
          severity: f.severity.toUpperCase() as
            | "CRITICAL"
            | "HIGH"
            | "MEDIUM"
            | "LOW"
            | "INFO",
          category: f.category.toUpperCase() as
            | "BUG"
            | "SECURITY"
            | "PERFORMANCE"
            | "STYLE"
            | "MAINTAINABILITY",
          title: f.title,
          description: f.description,
          suggestion: f.suggestion,
          language: chunks.find((c) => c.filePath === f.filePath)?.language,
        })),
      });
      console.log(`✓ Stored ${findings.length} findings`);
    }

    // ─── Step 7: Post inline comments on GitHub ───────────────────────────────
    console.log("\nPosting inline comments on GitHub PR...");
    let commentsPosted = 0;

    for (const finding of findings) {
      try {
        const commentBody = `**${getSeverityEmoji(finding.severity)} ${finding.severity.toUpperCase()} — ${finding.title}**\n\n${finding.description}\n\n**Suggestion:** ${finding.suggestion}`;

        await postInlineComment(
          installationId,
          owner,
          repo,
          prNumber,
          commitSha,
          finding.filePath,
          finding.lineStart,
          commentBody
        );

        commentsPosted++;
        // Small delay to avoid GitHub API rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (commentError) {
        // Don't fail the entire review if one comment fails
        // (e.g. line number doesn't exist in the diff)
        console.warn(
          `  Warning: Could not post comment for finding: ${finding.title}`
        );
      }
    }

    console.log(`✓ Posted ${commentsPosted}/${findings.length} inline comments`);

    // ─── Step 8: Post summary comment on PR ───────────────────────────────────
    console.log("\nPosting summary comment on PR...");

    const summaryComment = buildSummaryComment(
      prNumber,
      prFiles.length,
      findings.map((f) => ({
        severity: f.severity,
        category: f.category,
        title: f.title,
        filePath: f.filePath,
      })),
      overallScore,
      combinedSummary
    );

    await postPRComment(
      installationId,
      owner,
      repo,
      prNumber,
      summaryComment
    );

    console.log(`✓ Posted summary comment`);

    // ─── Step 9: Mark review as completed ────────────────────────────────────
    const durationMs = Date.now() - startTime;

    await prisma.review.update({
      where: { id: review.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        durationMs,
        filesReviewed: prFiles.length,
        tokensUsed: chunks.reduce((acc, c) => acc + c.diff.length / 4, 0),
        overallScore,
        summary: combinedSummary,
      },
    });

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✓ Review completed in ${durationMs}ms`);
    console.log(`  Score: ${overallScore}/100`);
    console.log(`  Findings: ${findings.length}`);
    console.log(`  Comments posted: ${commentsPosted}`);
    console.log(`${"=".repeat(60)}\n`);

  } catch (error) {
    console.error("Review job failed:", error);

    await prisma.review.update({
      where: { id: review.id },
      data: { status: "FAILED" },
    });

    throw error;
  }
}

function getSeverityEmoji(severity: string): string {
  const map: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
    info: "⚪",
  };
  return map[severity.toLowerCase()] ?? "⚪";
}

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

  worker.on("completed", (job) => {
    console.log(`✓ Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, error) => {
    console.error(`✗ Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("Worker error:", error);
  });

  console.log(`Worker started — listening on queue: ${QUEUE_NAME}`);
  return worker;
}