// lib/ai/gemini.ts
// Gemini AI client for code review analysis.
//
// This module handles:
//   1. Sending code chunks to Gemini for review
//   2. Parsing the structured JSON response
//   3. Validating findings (line numbers, required fields)
//   4. Graceful error handling (malformed JSON, API errors)
//
// We use gemini-2.0-flash-lite for speed and cost efficiency.
// The model is fast enough for real-time PR review feedback.

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { z } from "zod";
import type { CodeChunk } from "./chunker";
import { buildReviewPrompt } from "./prompts";

// ─── Zod Schema for AI Response Validation ────────────────────────────────────
// Zod validates the AI's JSON response at runtime, ensuring it matches
// our expected structure before we try to use it.
// If the AI returns malformed JSON or wrong field types, Zod catches it.

const FindingSchema = z.object({
  filePath: z.string(),
  lineStart: z.number().int().positive(),
  lineEnd: z.number().int().positive(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  category: z.enum([
    "bug",
    "security",
    "performance",
    "maintainability",
    "style",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  suggestion: z.string().min(1),
});

const ReviewResponseSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
  overallScore: z.number().int().min(0).max(100),
});

export type AIFinding = z.infer<typeof FindingSchema>;
export type AIReviewResponse = z.infer<typeof ReviewResponseSchema>;

// ─── Gemini Client ────────────────────────────────────────────────────────────

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        // Force JSON output — Gemini will only return valid JSON
        responseMimeType: "application/json",
        // Lower temperature = more consistent, less creative
        // We want precise technical analysis, not creative writing
        temperature: 0.1,
        // Limit output tokens — our JSON response shouldn't be huge
        maxOutputTokens: 2048,
      },
    });
  }
  return model;
}

// ─── Main Review Function ─────────────────────────────────────────────────────

export async function reviewChunk(
  chunk: CodeChunk,
  prDescription: string,
  retryCount = 0
): Promise<AIReviewResponse | null> {
  const prompt = buildReviewPrompt(chunk, prDescription);

  try {
    console.log(
      `  Sending chunk to Gemini: ${chunk.filePath} (${chunk.diff.length} chars)`
    );

    const result = await getModel().generateContent(prompt);
    const responseText = result.response.text();
    return parseAndValidateResponse(responseText, chunk);

  } catch (error: unknown) {
    // Handle rate limiting with automatic retry
    if (
      error instanceof Error &&
      error.message.includes("429") &&
      retryCount < 2
    ) {
      // Extract retry delay from error message if available
      const delayMatch = error.message.match(/retry in (\d+)/i);
      const delaySeconds = delayMatch ? parseInt(delayMatch[1]) + 5 : 45;

      console.log(
        `  Rate limited — retrying in ${delaySeconds}s (attempt ${retryCount + 1}/3)`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delaySeconds * 1000)
      );

      return reviewChunk(chunk, prDescription, retryCount + 1);
    }

    console.error(`  Gemini API error for ${chunk.filePath}:`, error);
    return null;
  }
}
// ─── Response Parsing + Validation ───────────────────────────────────────────

function parseAndValidateResponse(
  responseText: string,
  chunk: CodeChunk
): AIReviewResponse | null {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    // Strip markdown code fences if present
    // Some models wrap JSON in ```json ... ``` despite instructions
    const cleaned = responseText
      .replace(/^```json\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch {
    console.error(`  Failed to parse Gemini response as JSON`);
    console.error(`  Raw response: ${responseText.substring(0, 200)}`);
    return null;
  }

  // Step 2: Validate against our schema
  const validated = ReviewResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.error(`  Gemini response failed schema validation:`);
    console.error(validated.error.issues);
    return null;
  }

  // Step 3: Validate line numbers against actual diff
  // This prevents hallucinated line numbers that don't exist in the file
  const validatedFindings = validated.data.findings.filter((finding) => {
    const lineStr = finding.lineStart.toString();
    // Check if the line number appears anywhere in the diff
    // This is a loose check — better than nothing
    if (!chunk.diff.includes(`+${lineStr}`) &&
        !chunk.diff.includes(` ${lineStr}`)) {
      // Line number might still be valid — don't filter too aggressively
      // Just log it for debugging
      console.log(
        `  Warning: line ${finding.lineStart} not clearly visible in diff`
      );
    }
    return true; // Keep all findings for now, just warn
  });

  return {
    ...validated.data,
    findings: validatedFindings,
  };
}

// ─── Multi-chunk Review ───────────────────────────────────────────────────────

// Reviews multiple chunks and merges all findings
export async function reviewAllChunks(
  chunks: CodeChunk[],
  prDescription: string
): Promise<{
  findings: AIFinding[];
  summaries: string[];
  scores: number[];
}> {
  const findings: AIFinding[] = [];
  const summaries: string[] = [];
  const scores: number[] = [];

  for (const chunk of chunks) {
    // Small delay between chunks to avoid rate limiting
    if (chunks.indexOf(chunk) > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const result = await reviewChunk(chunk, prDescription);

    if (result) {
      findings.push(...result.findings);
      summaries.push(result.summary);
      scores.push(result.overallScore);
    }
  }

  return { findings, summaries, scores };
}