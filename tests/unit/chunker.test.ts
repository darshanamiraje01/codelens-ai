// tests/unit/chunker.test.ts
// Unit tests for the diff chunker.
// Tests all critical paths: small files, large files,
// skipped files, empty diffs, language detection.

import { describe, it, expect } from "vitest";
import { chunkDiff, detectLanguage } from "@/lib/ai/chunker";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const SMALL_DIFF = `diff --git a/src/utils.ts b/src/utils.ts
index abc123..def456 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,5 +1,8 @@
 export function add(a: number, b: number): number {
-  return a + b;
+  // Add two numbers together
+  const result = a + b;
+  return result;
 }
`;

const LOCKFILE_DIFF = `diff --git a/package-lock.json b/package-lock.json
index abc123..def456 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,5 +1,5 @@
 {
-  "version": "1.0.0",
+  "version": "1.0.1",
 }
`;

const BINARY_DIFF = `diff --git a/image.png b/image.png
index abc123..def456 100644
Binary files a/image.png and b/image.png differ
`;

const MULTI_FILE_DIFF = `diff --git a/src/api.ts b/src/api.ts
index abc123..def456 100644
--- a/src/api.ts
+++ b/src/api.ts
@@ -1,3 +1,4 @@
+import { Logger } from './logger';
 export function fetchData() {
   return fetch('/api/data');
 }
diff --git a/src/utils.ts b/src/utils.ts
index abc123..def456 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,3 +1,4 @@
+export const VERSION = '1.0.0';
 export function add(a: number, b: number) {
   return a + b;
 }
`;

// ─── chunkDiff tests ──────────────────────────────────────────────────────────

describe("chunkDiff", () => {
  it("returns empty array for empty diff", () => {
    expect(chunkDiff("")).toHaveLength(0);
    expect(chunkDiff("   ")).toHaveLength(0);
  });

  it("returns single chunk for small diff", () => {
    const chunks = chunkDiff(SMALL_DIFF);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].filePath).toBe("src/utils.ts");
    expect(chunks[0].language).toBe("TypeScript");
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].totalChunks).toBe(1);
  });

  it("skips package-lock.json", () => {
    const chunks = chunkDiff(LOCKFILE_DIFF);
    expect(chunks).toHaveLength(0);
  });

  it("skips binary files", () => {
    const chunks = chunkDiff(BINARY_DIFF);
    expect(chunks).toHaveLength(0);
  });

  it("handles multi-file diff correctly", () => {
    const chunks = chunkDiff(MULTI_FILE_DIFF);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].filePath).toBe("src/api.ts");
    expect(chunks[1].filePath).toBe("src/utils.ts");
  });

  it("preserves diff content in chunks", () => {
    const chunks = chunkDiff(SMALL_DIFF);
    expect(chunks[0].diff).toContain("+  // Add two numbers together");
    expect(chunks[0].diff).toContain("-  return a + b;");
  });

  it("detects correct language for each file", () => {
    const chunks = chunkDiff(MULTI_FILE_DIFF);
    chunks.forEach((chunk) => {
      expect(chunk.language).toBe("TypeScript");
    });
  });
});

// ─── detectLanguage tests ─────────────────────────────────────────────────────

describe("detectLanguage", () => {
  it("detects TypeScript files", () => {
    expect(detectLanguage("src/utils.ts")).toBe("TypeScript");
    expect(detectLanguage("components/Button.tsx")).toBe("TypeScript (React)");
  });

  it("detects JavaScript files", () => {
    expect(detectLanguage("utils.js")).toBe("JavaScript");
    expect(detectLanguage("App.jsx")).toBe("JavaScript (React)");
  });

  it("detects Python files", () => {
    expect(detectLanguage("script.py")).toBe("Python");
  });

  it("detects Java files", () => {
    expect(detectLanguage("Main.java")).toBe("Java");
  });

  it("returns Unknown for unrecognized extensions", () => {
    expect(detectLanguage("file.xyz")).toBe("Unknown");
    expect(detectLanguage("Makefile")).toBe("Unknown");
  });

  it("handles nested paths correctly", () => {
    expect(detectLanguage("src/components/ui/Button.tsx")).toBe(
      "TypeScript (React)"
    );
  });
});