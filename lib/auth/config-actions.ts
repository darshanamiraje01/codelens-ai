// lib/auth/config-actions.ts
// Exports the signIn/signOut server actions and auth() helper.
//
// Kept separate from lib/auth/config.ts because middleware.ts imports
// that file and runs on the Edge Runtime, which cannot use the full
// NextAuth instance (it needs Node.js APIs not available on Edge).
//
// This file is safe to import from Server Components and Server Actions,
// which run on the full Node.js runtime.

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

export const { auth, signIn, signOut } = NextAuth(authConfig);