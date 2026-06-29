// lib/github/client.ts
// GitHub API client for fetching PR data and posting review comments.
//
// All functions here take an installationId and handle authentication
// internally — callers don't need to know about tokens or auth flow.
//
// We use Octokit's REST client which gives us:
//   - Full TypeScript types for every API response
//   - Automatic rate limit handling
//   - Request/response logging in development

import { Octokit } from "@octokit/rest";
import { getInstallationToken } from "./auth";
import { getInstallationOctokit } from "./auth";

// Create an authenticated Octokit instance for a specific installation
// async function getOctokit(installationId: number): Promise<Octokit> {
//   const token = await getInstallationToken(installationId);
//   return new Octokit({
//     auth: token,
//     log: process.env.NODE_ENV === "development"
//       ? {
//           debug: (msg: string) => console.debug("[GitHub API]", msg),
//           info: (msg: string) => console.info("[GitHub API]", msg),
//           warn: (msg: string) => console.warn("[GitHub API]", msg),
//           error: (msg: string) => console.error("[GitHub API]", msg),
//         }
//       : undefined,
//   });
// }

async function getOctokit(installationId: number): Promise<Octokit> {
  return getInstallationOctokit(installationId);
}

// ─── PR Data Fetching ─────────────────────────────────────────────────────────

// Get the full diff for a PR as a string
// This is the raw unified diff format — the same format you see
// when running `git diff` in your terminal
export async function getPRDiff(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string> {
  const octokit = await getOctokit(installationId);

  // GitHub returns the diff when we set Accept header to diff media type
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number: prNumber,
      headers: {
        accept: "application/vnd.github.diff",
      },
    }
  );

  return response.data as unknown as string;
}

// Get metadata about all files changed in a PR
// Returns file paths, change counts, and patch (diff) per file
export async function getPRFiles(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
) {
  const octokit = await getOctokit(installationId);

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
    {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100, // Max files per request
    }
  );

  return data;
}

// Get PR details (title, description, author, base/head branches)
export async function getPRDetails(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
) {
  const octokit = await getOctokit(installationId);

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number: prNumber,
    }
  );

  return data;
}

// ─── Comment Posting ──────────────────────────────────────────────────────────

// Post a general comment on the PR (not tied to a specific line)
// Used for the overall review summary
export async function postPRComment(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<number> {
  const octokit = await getOctokit(installationId);

  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    {
      owner,
      repo,
      issue_number: prNumber, // PRs and Issues share the same comment API
      body,
    }
  );

  return data.id;
}

// Post an inline review comment on a specific line of a specific file
// This creates the highlighted line comments you see in GitHub PR reviews
export async function postInlineComment(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  commitSha: string,
  filePath: string,
  line: number,
  body: string
): Promise<number> {
  const octokit = await getOctokit(installationId);

  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments",
    {
      owner,
      repo,
      pull_number: prNumber,
      body,
      commit_id: commitSha,
      path: filePath,
      line,
      side: "RIGHT", // RIGHT = the new version of the file (not the old)
    }
  );

  return data.id;
}

// ─── Helper Utilities ─────────────────────────────────────────────────────────

// Parse "owner/repo" format into separate owner and repo strings
// e.g. "darshanamiraje01/codelens-ai" → { owner: "darshanamiraje01", repo: "codelens-ai" }
export function parseRepoFullName(fullName: string): {
  owner: string;
  repo: string;
} {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repository full name: ${fullName}`);
  }
  return { owner, repo };
}