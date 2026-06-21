// app/api/auth/[...nextauth]/route.ts
// NextAuth v5 route handler for Next.js App Router.
//
// The [...nextauth] catch-all segment means this single file handles
// ALL auth-related HTTP requests:
//
//   GET  /api/auth/signin          → show sign in options
//   GET  /api/auth/callback/github → handle GitHub OAuth callback
//   POST /api/auth/callback/github → process callback
//   GET  /api/auth/signout         → sign out
//   GET  /api/auth/session         → get current session (used by client)
//   GET  /api/auth/csrf            → CSRF token for forms
//
// NextAuth generates all these handlers from our config automatically.

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

const { handlers } = NextAuth(authConfig);

// Export named GET and POST — Next.js App Router convention
export const { GET, POST } = handlers;