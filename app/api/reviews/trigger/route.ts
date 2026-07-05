// app/api/reviews/trigger/route.ts
// Manually trigger a PR review from the dashboard.
//
// Unlike the webhook handler which is triggered by GitHub,
// this endpoint is triggered by authenticated users from the UI.
// It skips HMAC verification (not a webhook) but requires
// a valid user session instead.
//
// It reuses the same BullMQ queue as the webhook handler,
// so the review process is identical regardless of trigger source.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config-actions";
import { reviewQueue } from "@/lib/queue";
import { getInstallationOctokit } from "@/lib/github/auth";
import prisma from "@/lib/db";
import type { ReviewJobPayload } from "@/types";

export async function POST(request: NextRequest) {
  // ─── Auth check ────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── Parse request body ────────────────────────────────────────────────────
  const body = await request.json();
  const { repoFullName, prNumber } = body;

  if (!repoFullName || !prNumber) {
    return NextResponse.json(
      { error: "repoFullName and prNumber are required" },
      { status: 400 }
    );
  }

  // ─── Find the repository in our DB ─────────────────────────────────────────
  const repository = await prisma.repository.findFirst({
    where: { fullName: repoFullName },
    include: { installation: true },
  });

  if (!repository) {
    return NextResponse.json(
      { error: `Repository ${repoFullName} not found. Make sure the GitHub App is installed on this repo.` },
      { status: 404 }
    );
  }

  // ─── Fetch PR details from GitHub ──────────────────────────────────────────
  // We need the commit SHA and PR metadata to build the job payload
  const octokit = await getInstallationOctokit(
    repository.installation.installationId
  );

  const [owner, repo] = repoFullName.split("/");

  let prData;
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}",
      { owner, repo, pull_number: Number(prNumber) }
    );
    prData = data;
  } catch {
    return NextResponse.json(
      { error: `PR #${prNumber} not found in ${repoFullName}` },
      { status: 404 }
    );
  }

  // ─── Build job payload ─────────────────────────────────────────────────────
  const jobPayload: ReviewJobPayload = {
    installationId: repository.installation.installationId,
    repoFullName,
    prNumber: Number(prNumber),
    prTitle: prData.title,
    prAuthor: prData.user?.login ?? "unknown",
    commitSha: prData.head.sha,
    diffUrl: prData.diff_url ?? "",
  };

  // ─── Push to queue ─────────────────────────────────────────────────────────
  const job = await reviewQueue.add("review-pr", jobPayload, {
    jobId: `manual-${repoFullName}-${prNumber}-${prData.head.sha}`,
  });

  console.log(
    `✓ Manual review triggered by ${session.user.githubLogin} for PR #${prNumber} in ${repoFullName}`
  );

  return NextResponse.json(
    {
      success: true,
      jobId: job.id,
      message: `Review queued for PR #${prNumber}`,
    },
    { status: 200 }
  );
}