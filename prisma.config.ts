// prisma.config.ts
// Prisma 7 configuration — handles database connection for migrations.
// Connection URLs live here instead of schema.prisma (Prisma 7 change).

import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
});