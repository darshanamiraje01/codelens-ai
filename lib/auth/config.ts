// lib/auth/config.ts
// NextAuth v5 configuration.
//
// This file defines:
//   - Which OAuth providers we support (GitHub)
//   - How we store users in our database
//   - How we customize the JWT and session
//   - Which pages handle auth UI
//
// This config is imported by both the API route handler AND
// the middleware — so it must not import Next.js server-only modules.

import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import prisma from "@/lib/db";

export const authConfig: NextAuthConfig = {
  // ─── Providers ──────────────────────────────────────────────────────────────
  // List of OAuth providers users can sign in with.
  // We start with GitHub only — it's the only one that makes sense
  // for a developer tool like CodeLens AI.
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  // ─── Custom Pages ───────────────────────────────────────────────────────────
  // Tell NextAuth where our custom login page lives.
  // Without this, NextAuth would use its own default UI.
  pages: {
    signIn: "/login",
  },

  // ─── Callbacks ──────────────────────────────────────────────────────────────
  // Callbacks let us customize what happens at each step of the auth flow.
  callbacks: {
    // authorized() runs on every request via middleware.
    // It decides: is this user allowed to access this route?
    // Return true  → allow the request
    // Return false → redirect to login page
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = !nextUrl.pathname.startsWith("/login");

      if (isOnDashboard) {
        // If trying to access any page other than login,
        // must be logged in
        return isLoggedIn;
      }

      if (isLoggedIn) {
        // If already logged in and visiting /login,
        // redirect to dashboard
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },

    // jwt() runs when a JWT is created or updated.
    // We add the GitHub user ID to the token so we can
    // identify users in API routes without a DB query.
    async jwt({ token, profile }) {
        if (profile) {
        // profile.id from GitHub is a number but NextAuth types it loosely.
        // Number() converts it safely; we validate it's finite before using it.
        const githubId = Number(profile.id);
    
        if (!isFinite(githubId)) {
            throw new Error(`Invalid GitHub ID received: ${profile.id}`);
        }

        // Upsert: create the user if this is their first login,
        // or update their profile if they've logged in before
        // (their GitHub avatar/login may have changed since last visit)
        const user = await prisma.user.upsert({
        where: { githubId },
        create: {
            githubId,
            githubLogin: profile.login as string,
            email: (profile.email as string | null) ?? null,
            avatarUrl: profile.avatar_url as string,
          },
          update: {
            githubLogin: profile.login as string,
            avatarUrl: profile.avatar_url as string,
          },
        });

        // Store our internal DB id (not GitHub's id) in the token —
        // this is what we'll use to query the user's data everywhere else
        token.userId = user.id;
        token.githubId = githubId;
        token.githubLogin = profile.login as string;
        token.avatarUrl = profile.avatar_url as string;
        }
        return token;
    },

    // session() runs when session data is requested by the client.
    // We expose selected token fields to the frontend.
    // Never put sensitive data here — session is readable client-side.
    async session({ session, token }) {
      if (token) {
        session.user.userId = token.userId as string;
        session.user.githubId = token.githubId as number;
        session.user.githubLogin = token.githubLogin as string;
        session.user.avatarUrl = token.avatarUrl as string;
      }
      return session;
    },
  },

  // ─── Session Strategy ────────────────────────────────────────────────────────
  // "jwt" means sessions are stored in signed cookies, not the database.
  // This is stateless — no DB query needed to validate a session.
  // The alternative "database" strategy stores sessions in a DB table,
  // which allows instant revocation but adds a DB query to every request.
  session: {
    strategy: "jwt",
  },
};