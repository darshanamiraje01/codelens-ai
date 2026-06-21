// types/next-auth.d.ts
// Extends NextAuth's built-in TypeScript types with our custom fields.
//
// NextAuth uses "declaration merging" — we re-declare the same interfaces
// NextAuth exports and TypeScript merges our additions into them.
// This gives us full type safety on session.user throughout the app.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      githubId: number;
      githubLogin: string;
      avatarUrl: string;
    } & DefaultSession["user"];
    // & DefaultSession["user"] preserves the original fields:
    // name, email, image — so we don't lose them
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    githubId: number;
    githubLogin: string;
    avatarUrl: string;
  }
}