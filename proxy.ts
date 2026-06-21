// middleware.ts
// Next.js middleware — runs on every request BEFORE the page renders.
//
// We use it for two things:
//   1. Protect routes — redirect unauthenticated users to /login
//   2. Redirect logged-in users away from /login to dashboard
//
// The authorized() callback in lib/auth/config.ts contains the logic.
// Middleware just wires NextAuth into Next.js's request pipeline.
//
// IMPORTANT: Middleware runs on the Edge Runtime (not Node.js).
// This means it's extremely fast (runs at CDN level) but cannot
// use Node.js-specific APIs like 'fs' or our Prisma DB client.

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);
export const proxy = auth;

// matcher tells Next.js which routes this middleware applies to.
// We exclude static files and Next.js internals for performance —
// there's no point running auth checks on image requests.

// matcher tells Next.js which routes this proxy applies to.
// We exclude:
//   - api/auth        → NextAuth's own routes (login/callback/session)
//   - api/webhooks     → GitHub webhook events — these authenticate via
//                        HMAC signature verification, NOT user sessions.
//                        GitHub is a server, not a logged-in human.
//   - _next/static     → built JS/CSS assets
//   - _next/image      → Next.js image optimization
//   - favicon.ico, *.png → static files
export const config = {
  matcher: [
    "/((?!api/auth|api/webhooks|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};