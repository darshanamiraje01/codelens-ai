// lib/github/auth.ts
// GitHub App authentication using @octokit/auth-app directly.
// Avoids @octokit/app which is pure ESM and causes module
// resolution conflicts in our CommonJS worker process.

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import fs from "node:fs";
import path from "node:path";

// Cache installation tokens to avoid regenerating on every API call
const tokenCache = new Map<number, { token: string; expiresAt: Date }>();

function getPrivateKey(): string {
  const privateKeyPath = path.resolve(
    process.cwd(),
    process.env.GITHUB_APP_PRIVATE_KEY_PATH ??
      ".secrets/github-app-private-key.pem"
  );

  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(
      `GitHub App private key not found at: ${privateKeyPath}`
    );
  }

  return fs.readFileSync(privateKeyPath, "utf-8");
}

export async function getInstallationToken(
  installationId: number
): Promise<string> {
  // Check cache first — avoid unnecessary API calls
  const cached = tokenCache.get(installationId);
  if (cached) {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (cached.expiresAt > fiveMinutesFromNow) {
      return cached.token;
    }
  }

  if (!process.env.GITHUB_APP_ID) {
    throw new Error("GITHUB_APP_ID environment variable is not set");
  }

  // Create auth strategy using App credentials
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID,
    privateKey: getPrivateKey(),
  });

  // Exchange for installation-scoped token
  const installationAuth = await auth({
    type: "installation",
    installationId,
  });

  // Cache the token
  tokenCache.set(installationId, {
    token: installationAuth.token,
    expiresAt: new Date(installationAuth.expiresAt),
  });

  return installationAuth.token;
}

// Create an authenticated Octokit instance for a specific installation
export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  const token = await getInstallationToken(installationId);
  return new Octokit({ auth: token });
}