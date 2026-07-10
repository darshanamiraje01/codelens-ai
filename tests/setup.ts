// tests/setup.ts
// Global test setup — runs before every test file.
// Sets up environment variables needed for tests.
// Note: NODE_ENV is set automatically by Vitest to "test"
// so we don't need to set it manually.

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.GITHUB_WEBHOOK_SECRET = "test-webhook-secret";
process.env.NEXTAUTH_SECRET = "test-nextauth-secret";
process.env.GEMINI_API_KEY = "test-gemini-key";