// types/index.ts
// Global TypeScript types and interfaces for CodeLens AI
// All shared types live here so they can be imported from '@/types'

// ─── Severity & Category Enums ────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Category =
  | 'bug'
  | 'security'
  | 'performance'
  | 'style'
  | 'maintainability';

export type ReviewStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type Plan = 'free' | 'pro';

// ─── Database Entity Types ─────────────────────────────────────────────────────
// These mirror our database schema exactly.
// One interface per table.

export interface User {
  id: string;
  githubId: number;
  githubLogin: string;
  email: string | null;
  avatarUrl: string;
  plan: Plan;
  createdAt: Date;
  updatedAt: Date;
}

export interface Installation {
  id: string;
  installationId: number;
  accountLogin: string;
  accountType: 'User' | 'Organization';
  ownerId: string;
  createdAt: Date;
}

export interface Repository {
  id: string;
  installationId: string;
  githubRepoId: number;
  fullName: string;
  language: string | null;
  isActive: boolean;
  settings: RepoSettings;
  createdAt: Date;
}

export interface Review {
  id: string;
  repositoryId: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  commitSha: string;
  status: ReviewStatus;
  overallScore: number | null;
  filesReviewed: number;
  tokensUsed: number;
  durationMs: number | null;
  summary: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface Finding {
  id: string;
  reviewId: string;
  filePath: string;
  lineStart: number | null;
  lineEnd: number | null;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  suggestion: string | null;
  codeSnippet: string | null;
  language: string | null;
  ruleId: string | null;
  githubCommentId: number | null;
  createdAt: Date;
}

// ─── Nested / Config Types ─────────────────────────────────────────────────────

export interface RepoSettings {
  enabledCategories: Category[];
  minSeverity: Severity;
  ignoredPaths: string[];
  customRules: CustomRule[];
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  pattern: string;
}

// ─── Job Queue Types ───────────────────────────────────────────────────────────
// Payload sent to BullMQ when a PR webhook fires.

export interface ReviewJobPayload {
  installationId: number;
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  commitSha: string;
  diffUrl: string;
}

// ─── AI Types ─────────────────────────────────────────────────────────────────
// What we send to the AI and what we expect back.

export interface CodeChunk {
  filePath: string;
  language: string;
  diff: string;
  repoName: string;
  prDescription: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface AIFinding {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  suggestion: string;
  codeSnippet: string;
}

export interface AIReviewOutput {
  findings: AIFinding[];
  summary: string;
  overallScore: number;
  breakdown: {
    bugs: number;
    security: number;
    performance: number;
    style: number;
    maintainability: number;
  };
}

// ─── API Response Types ────────────────────────────────────────────────────────
// Standard shape for all API responses from our backend.

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}