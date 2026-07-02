// lib/ai/prompts.ts
// Prompt templates for the AI code review engine.
//
// Prompt engineering principles applied here:
//
// 1. ROLE — tell the AI who it is ("senior software engineer")
//    This primes it to respond with appropriate expertise level
//
// 2. STRUCTURED OUTPUT — demand JSON, not prose
//    Prose responses can't be parsed programmatically
//    JSON forces the AI to organize its thoughts into specific fields
//
// 3. EXPLICIT CONSTRAINTS — tell it what NOT to do
//    "Only report issues visible in the diff" reduces hallucinations
//    "Maximum 10 findings" prevents overwhelming noise
//
// 4. CONCRETE EXAMPLES in severity definitions
//    Vague definitions lead to inconsistent severity assignment
//    Concrete examples anchor the AI's interpretation
//
// 5. ESCAPE HATCH — "if uncertain, omit"
//    Better to miss a finding than to confidently report a wrong one

import type { CodeChunk } from "./chunker";

export function buildReviewPrompt(chunk: CodeChunk, prDescription: string): string {
  return `You are a senior software engineer performing a thorough code review.
Analyze the following code changes and identify real issues that would matter in production.

## Context
- File: ${chunk.filePath}
- Language: ${chunk.language}
- PR Description: ${prDescription || "No description provided"}
${chunk.totalChunks > 1 ? `- Note: This is chunk ${chunk.chunkIndex + 1} of ${chunk.totalChunks} for this file` : ""}

## Changed Code (unified diff format)
Lines starting with + are additions, - are removals, space is unchanged context.

\`\`\`diff
${chunk.diff}
\`\`\`

## Review Instructions
Analyze for these categories (in order of importance):
1. **bug** — Logic errors, null/undefined issues, off-by-one errors, race conditions, incorrect comparisons
2. **security** — SQL injection, XSS, exposed secrets, insecure dependencies, missing auth checks, CSRF
3. **performance** — N+1 queries, unnecessary re-renders, blocking operations, memory leaks, inefficient algorithms
4. **maintainability** — Overly complex functions, missing error handling, unclear variable names, missing types
5. **style** — Violations of common conventions for ${chunk.language}

## Severity Definitions
- **critical**: Exploitable security vulnerability OR bug that will definitely cause data loss/crash in production
- **high**: Bug that will likely cause incorrect behavior in common usage
- **medium**: Code smell that increases bug risk or significantly hurts maintainability
- **low**: Minor style issue or small improvement opportunity
- **info**: Suggestion or best practice worth considering

## Hard Rules
- ONLY report issues clearly visible in the provided diff
- DO NOT hallucinate — if you are not certain an issue exists, omit it
- DO NOT report issues in unchanged context lines (lines starting with space)
- Line numbers must correspond to lines in the diff above
- Maximum 8 findings per chunk — focus on the most important issues
- If there are genuinely no issues, return an empty findings array

## Response Format
Respond with ONLY valid JSON. No markdown, no explanation, no text before or after the JSON.
The JSON must exactly match this structure:

{
  "findings": [
    {
      "filePath": "${chunk.filePath}",
      "lineStart": <integer — line number in the file where issue starts>,
      "lineEnd": <integer — line number where issue ends, same as lineStart if single line>,
      "severity": <"critical" | "high" | "medium" | "low" | "info">,
      "category": <"bug" | "security" | "performance" | "maintainability" | "style">,
      "title": <short descriptive title, max 80 chars>,
      "description": <clear explanation of WHY this is an issue, 1-3 sentences>,
      "suggestion": <concrete fix or improvement, 1-3 sentences>
    }
  ],
  "summary": <2-3 sentence overall assessment of the code changes>,
  "overallScore": <integer 0-100, where 100 is perfect code with no issues>
}`;
}

// Prompt for generating the PR summary comment posted on GitHub
export function buildSummaryComment(
  prNumber: number,
  filesReviewed: number,
  findings: Array<{
    severity: string;
    category: string;
    title: string;
    filePath: string;
  }>,
  overallScore: number,
  summary: string
): string {
  // Count findings by severity
  const counts = {
    critical: findings.filter((f) => f.severity === "CRITICAL").length,
    high: findings.filter((f) => f.severity === "HIGH").length,
    medium: findings.filter((f) => f.severity === "MEDIUM").length,
    low: findings.filter((f) => f.severity === "LOW").length,
    info: findings.filter((f) => f.severity === "INFO").length,
  };

  const totalIssues = findings.length;

  // Score emoji
  const scoreEmoji =
    overallScore >= 90 ? "🟢" :
    overallScore >= 70 ? "🟡" :
    overallScore >= 50 ? "🟠" : "🔴";

  // Build findings table if there are any
  const findingsTable =
    totalIssues > 0
      ? `
## Findings (${totalIssues} total)

| Severity | Category | Issue | File |
|----------|----------|-------|------|
${findings
  .slice(0, 20) // Show max 20 in summary
  .map(
    (f) =>
      `| ${getSeverityEmoji(f.severity)} ${f.severity} | ${f.category} | ${f.title} | \`${f.filePath}\` |`
  )
  .join("\n")}
${totalIssues > 20 ? `\n_...and ${totalIssues - 20} more findings. See inline comments for details._` : ""}
`
      : "\n## ✅ No issues found\n";

  return `## 🔍 CodeLens AI Review

${scoreEmoji} **Overall Score: ${overallScore}/100**

${summary}

### Summary
| Category | Count |
|----------|-------|
| 🔴 Critical | ${counts.critical} |
| 🟠 High | ${counts.high} |
| 🟡 Medium | ${counts.medium} |
| 🔵 Low | ${counts.low} |
| ⚪ Info | ${counts.info} |
| 📁 Files reviewed | ${filesReviewed} |

${findingsTable}

---
_Review generated by [CodeLens AI](http://localhost:3000) • PR #${prNumber}_`;
}

function getSeverityEmoji(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: "🔴",
    HIGH: "🟠",
    MEDIUM: "🟡",
    LOW: "🔵",
    INFO: "⚪",
  };
  return map[severity.toUpperCase()] ?? "⚪";
}