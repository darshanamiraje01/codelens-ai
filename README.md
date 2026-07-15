# 🔍 CodeLens AI

> **AI-powered code review for every GitHub pull request.**  
> Instant feedback on bugs, security vulnerabilities, performance issues, and code quality — posted as inline comments directly on your PR.

![CodeLens AI Dashboard](https://via.placeholder.com/1200x600/7c3aed/ffffff?text=CodeLens+AI+Dashboard)

---

## ✨ What it does

When a developer opens a pull request on a connected repository, CodeLens AI automatically:

1. **Receives** the GitHub webhook event (verified with HMAC-SHA256)
2. **Fetches** the PR diff from the GitHub API
3. **Chunks** the diff into token-bounded segments
4. **Analyzes** each segment with Google Gemini AI
5. **Posts** inline review comments directly on the PR
6. **Scores** the overall code quality (0–100)
7. **Stores** all findings in the dashboard for historical tracking

---

## 🖥️ Screenshots

| Dashboard | Review Detail | GitHub PR Comments |
|-----------|--------------|-------------------|
| Stats, charts, recent reviews | Score, findings by file, suggestions | Inline AI comments on code |

---

## 🏗️ Architecture

```
GitHub PR Event
      ↓ webhook (HMAC-SHA256 verified)
Next.js API Route
      ↓ job queued instantly (<200ms response)
BullMQ + Upstash Redis
      ↓ background processing
Worker Process
      ├── GitHub API (fetch diff)
      ├── Gemini 2.5 Flash (AI analysis)
      ├── PostgreSQL (store findings)
      └── GitHub API (post inline comments)
```

**Why a job queue?** GitHub requires webhook responses within 10 seconds. AI review takes 30–120 seconds. The queue lets us respond instantly and process asynchronously — exactly how production CI/CD bots work.

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16, TypeScript, Tailwind CSS | App Router, Server Components, type safety |
| UI Components | shadcn/ui + Radix primitives | Accessible, production-quality components |
| Auth | NextAuth.js v5, GitHub OAuth | Secure JWT sessions, httpOnly cookies |
| Database | PostgreSQL (Neon) + Prisma 7 ORM | Relational data, type-safe queries |
| Queue | BullMQ + Redis (Upstash) | Async job processing, retry logic |
| AI | Google Gemini 2.5 Flash | 1M context window, structured JSON output |
| GitHub Integration | Octokit + GitHub App | Webhook events, PR diff, inline comments |
| Charts | Recharts | Score trends, severity breakdown |
| Testing | Vitest | Unit tests for chunker and HMAC verification |
| Deployment | Vercel (frontend) + Render (worker) | Auto-deploy on push to main |

---

## 🚀 Features

### Core Features
- **Automatic PR Reviews** — webhook-triggered on PR open/update/reopen
- **Manual Trigger** — review any open PR from the dashboard on demand
- **Inline GitHub Comments** — findings posted as code-level review comments
- **Overall Score** — 0–100 quality score per PR
- **5 Categories** — Bug, Security, Performance, Maintainability, Style
- **5 Severity Levels** — Critical, High, Medium, Low, Info

### Dashboard
- **Stats Overview** — total reviews, average score, findings count
- **Score Trend Chart** — code quality over time (Recharts)
- **Severity Breakdown** — donut chart of findings by severity
- **Review History** — paginated list with status, score, duration
- **Review Detail** — findings grouped by file with suggestions
- **Repository Management** — activate/deactivate reviews per repo

### Engineering
- **HMAC-SHA256 Verification** — cryptographic proof every webhook is genuine
- **Job Deduplication** — same PR commit never reviewed twice
- **Retry Logic** — automatic exponential backoff on failures (3 attempts)
- **Token Optimization** — diff chunking keeps AI calls within context limits
- **Hallucination Prevention** — Zod schema validation on every AI response
- **Graceful Shutdown** — worker waits for current job before exiting

---

## 📊 What the AI Reviews

```javascript
// Example: CodeLens AI catches these issues automatically

// ❌ CRITICAL (Security) — SQL Injection
const query = "SELECT * FROM users WHERE id = " + req.query.id

// ❌ HIGH (Bug) — Off-by-one error  
for (var i = arr.length; i > arr.length - count; i--) {
  items.push(arr[i])  // arr[arr.length] is undefined
}

// ❌ CRITICAL (Security) — Hardcoded credentials
const API_KEY = "sk-prod-abc123secretkey456"

// ❌ HIGH (Bug) — Null reference
return user.profile.name.toUpperCase()  // crashes if profile is null
```

---

## 🧰 Local Development Setup

### Prerequisites
- Node.js 22 LTS (via nvm)
- Git
- Accounts: GitHub, Neon, Upstash, Google AI Studio

### 1. Clone and install

```bash
git clone https://github.com/darshanamiraje01/codelens-ai.git
cd codelens-ai
npm install
```

### 2. Environment variables

Create `.env.local` at the project root:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth (NextAuth.js)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# GitHub OAuth App
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"

# GitHub App
GITHUB_APP_ID="your-app-id"
GITHUB_APP_PRIVATE_KEY_PATH=".secrets/github-app-private-key.pem"
GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# Redis (Upstash)
REDIS_URL="rediss://..."

# AI
GEMINI_API_KEY="your-gemini-key"
```

### 3. Database setup

```bash
npm run db:migrate   # Run migrations
npm run db:generate  # Generate Prisma client
```

### 4. GitHub App setup

1. Create a GitHub App at `github.com/settings/apps`
2. Set permissions: Contents (read), Pull requests (read/write), Checks (read/write)
3. Subscribe to: Pull request events
4. Download private key → place in `.secrets/github-app-private-key.pem`
5. Install the App on a test repository

### 5. Run the development servers

```bash
# Terminal 1 — Next.js app
npm run dev

# Terminal 2 — Webhook tunnel (receives GitHub events locally)
npm run webhook:listen

# Terminal 3 — BullMQ worker (processes review jobs)
npm run worker
```

Open `http://localhost:3000` and login with GitHub.

---

## 🗄️ Database Schema

```
users          → GitHub OAuth profiles
installations  → GitHub App installations (per org/account)
repositories   → Connected repos (one per GitHub repo)
reviews        → One per PR review session
findings       → Individual AI findings within a review
```

---

## 🧪 Testing

```bash
npm test              # Run all tests (20 tests)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Test coverage:**
- `tests/unit/chunker.test.ts` — 13 tests for diff chunking logic
- `tests/unit/webhook.test.ts` — 7 tests for HMAC-SHA256 verification

---

## 📁 Project Structure

```
codelens-ai/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Dashboard pages (sidebar layout)
│   │   ├── page.tsx           # Overview with charts
│   │   ├── reviews/           # Review list + detail
│   │   └── repos/             # Repository management
│   └── api/
│       ├── auth/              # NextAuth.js handlers
│       ├── webhooks/github/   # GitHub webhook receiver
│       ├── reviews/trigger/   # Manual review trigger
│       └── repos/[id]/toggle/ # Repository toggle
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── dashboard/             # Stats, charts, review table
│   ├── layout/                # Sidebar, navbar
│   └── repos/                 # Repository management
├── lib/
│   ├── ai/                    # Gemini client, chunker, prompts
│   ├── github/                # Octokit client, App auth
│   ├── queue/                 # BullMQ setup + worker
│   ├── db/                    # Prisma client singleton
│   └── auth/                  # NextAuth config
├── workers/
│   └── index.ts               # Standalone worker process
├── tests/
│   └── unit/                  # Vitest unit tests
├── prisma/
│   └── schema.prisma          # Database schema
└── types/
    └── index.ts               # Global TypeScript interfaces
```

---

## 🔒 Security Practices

- **HMAC-SHA256** webhook verification with timing-safe comparison
- **JWT sessions** stored in httpOnly cookies (not localStorage)
- **GitHub App** authentication with installation-scoped tokens
- **Zod validation** on all AI responses before database storage
- **Route protection** via Next.js proxy middleware
- **Environment secrets** never committed to Git
- **Least privilege** GitHub App permissions

---

## 💡 Key Engineering Decisions

**Why BullMQ instead of processing webhooks synchronously?**  
GitHub requires a webhook response within 10 seconds. AI review takes 30–120 seconds. The queue decouples receipt from processing — we acknowledge in <200ms and process asynchronously. This also enables retry logic and deduplication.

**Why JWT sessions instead of database sessions?**  
Stateless JWT means no database query on every request to validate a session. The trade-off is slightly larger cookies and no instant revocation — acceptable for this use case.

**Why Gemini 2.5 Flash over GPT-4o?**  
1M token context window handles entire large diffs. Better price/performance for high-volume code review. Structured JSON output mode reduces parsing failures.

**Why PostgreSQL over MongoDB?**  
Reviews have relational structure (review → findings → repositories). PostgreSQL's JSONB column handles flexible `settings` while maintaining relational integrity elsewhere.

---

## 👩‍💻 Author

**Darshana Miraje**  
Final-year Information Technology student  
Dr. D. Y. Patil College of Engineering, Akurdi, Pune  
CGPA: 9.24/10

- GitHub: [@darshanamiraje01](https://github.com/darshanamiraje01)
- Project: [github.com/darshanamiraje01/codelens-ai](https://github.com/darshanamiraje01/codelens-ai)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.