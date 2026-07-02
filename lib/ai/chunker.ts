// lib/ai/chunker.ts
// Splits a unified diff into reviewable chunks for the AI.
//
// Why chunking is necessary:
//   - Large PRs can have thousands of lines of diff
//   - AI models have context window limits (tokens)
//   - Sending too much in one call degrades review quality
//     (the AI loses focus on specific issues)
//   - Smaller, focused chunks produce better findings
//
// Chunking strategy:
//   1. Split diff by file (each @@ header marks a new file section)
//   2. Skip irrelevant files (binary, generated, lock files)
//   3. Split large files on hunk boundaries (lines starting with @@)
//   4. Never split mid-hunk — AI needs complete context per hunk
//   5. Target ~4,000 tokens per chunk (chars / 4 ≈ tokens)

export interface CodeChunk {
  filePath: string;
  language: string;
  diff: string;
  chunkIndex: number;
  totalChunks: number;
}

// Conservative token estimate — 4 chars per token
// We use 4,000 tokens target leaving room for prompt + response
const MAX_CHARS_PER_CHUNK = 4000 * 4; // 16,000 chars

// Files we should never send to the AI for review
const IGNORED_PATTERNS = [
  // Lock files — generated, huge, no logic to review
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "composer.lock",
  "Gemfile.lock",
  // Generated/minified files
  ".min.js",
  ".min.css",
  ".generated.",
  "__generated__",
  // Build output
  "dist/",
  "build/",
  ".next/",
  "out/",
  // Binary file indicators in diff
  "Binary files",
];

// Map file extensions to language names for the AI prompt
const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript (React)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (React)",
  ".py": "Python",
  ".java": "Java",
  ".go": "Go",
  ".rs": "Rust",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".c": "C",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".sql": "SQL",
  ".md": "Markdown",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
};

export function detectLanguage(filePath: string): string {
  const ext = "." + filePath.split(".").pop()?.toLowerCase();
  return LANGUAGE_MAP[ext] ?? "Unknown";
}

function shouldSkipFile(filePath: string, diffContent: string): boolean {
  // Check against ignored patterns
  for (const pattern of IGNORED_PATTERNS) {
    if (filePath.includes(pattern) || diffContent.includes(pattern)) {
      return true;
    }
  }
  return false;
}

// Split a unified diff string into per-file sections
// Each section starts with "diff --git a/..." line
function splitDiffByFile(
  rawDiff: string
): Array<{ filePath: string; content: string }> {
  const files: Array<{ filePath: string; content: string }> = [];

  // Split on "diff --git" markers
  const fileSections = rawDiff.split(/(?=diff --git )/);

  for (const section of fileSections) {
    if (!section.trim()) continue;

    // Extract file path from the diff header
    // Format: "diff --git a/path/to/file.ts b/path/to/file.ts"
    const match = section.match(/diff --git a\/.+ b\/(.+)/);
    if (!match) continue;

    const filePath = match[1].trim();
    files.push({ filePath, content: section });
  }

  return files;
}

// Split a file's diff content into hunk-bounded chunks
// Hunks start with "@@ -line,count +line,count @@" markers
function splitIntoHunks(diffContent: string): string[] {
  const hunks: string[] = [];
  const lines = diffContent.split("\n");

  let currentHunk = "";
  let inHunk = false;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      // Start of a new hunk
      if (currentHunk && inHunk) {
        hunks.push(currentHunk);
      }
      currentHunk = line + "\n";
      inHunk = true;
    } else if (!inHunk) {
      // Header lines before first hunk (file metadata)
      currentHunk += line + "\n";
    } else {
      currentHunk += line + "\n";
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}

// Main export — takes raw unified diff, returns array of reviewable chunks
export function chunkDiff(rawDiff: string): CodeChunk[] {
  if (!rawDiff || rawDiff.trim().length === 0) {
    return [];
  }

  const chunks: CodeChunk[] = [];
  const files = splitDiffByFile(rawDiff);

  for (const file of files) {
    // Skip files that shouldn't be reviewed
    if (shouldSkipFile(file.filePath, file.content)) {
      console.log(`  Skipping: ${file.filePath}`);
      continue;
    }

    const language = detectLanguage(file.filePath);

    if (file.content.length <= MAX_CHARS_PER_CHUNK) {
      // Small file — send as single chunk
      chunks.push({
        filePath: file.filePath,
        language,
        diff: file.content,
        chunkIndex: 0,
        totalChunks: 1,
      });
    } else {
      // Large file — split on hunk boundaries
      const hunks = splitIntoHunks(file.content);
      let currentChunkContent = "";
      let chunkIndex = 0;
      const fileChunks: string[] = [];

      for (const hunk of hunks) {
        if (
          currentChunkContent.length + hunk.length > MAX_CHARS_PER_CHUNK &&
          currentChunkContent.length > 0
        ) {
          // Current chunk would exceed limit — save and start new one
          fileChunks.push(currentChunkContent);
          currentChunkContent = hunk;
        } else {
          currentChunkContent += hunk;
        }
      }

      // Don't forget the last chunk
      if (currentChunkContent) {
        fileChunks.push(currentChunkContent);
      }

      // Now we know totalChunks, create the CodeChunk objects
      for (const chunkContent of fileChunks) {
        chunks.push({
          filePath: file.filePath,
          language,
          diff: chunkContent,
          chunkIndex: chunkIndex++,
          totalChunks: fileChunks.length,
        });
      }
    }
  }

  return chunks;
}