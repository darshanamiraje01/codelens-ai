// lib/db/index.ts
// Prisma client singleton configured for Neon serverless PostgreSQL.
//
// Neon requires a WebSocket-based connection adapter for serverless
// environments. @prisma/adapter-neon handles this automatically.
//
// Two connection types:
//   DATABASE_URL  → pooled connection (used at runtime, scales well)
//   DIRECT_URL    → direct connection (used by Prisma migrate only)

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  // Neon adapter uses the pooled DATABASE_URL for all runtime queries
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;