// app/(dashboard)/reviews/[id]/page.tsx
// Detailed view of a single review — findings, score breakdown, PR info.

import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  GitPullRequest,
  User,
  GitCommit,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Shield,
  Zap,
  Code,
  Wrench,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import prisma from "@/lib/db";

// Severity configuration
const severityConfig = {
  CRITICAL: {
    label: "Critical",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    badge: "destructive" as const,
    emoji: "🔴",
  },
  HIGH: {
    label: "High",
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    badge: "destructive" as const,
    emoji: "🟠",
  },
  MEDIUM: {
    label: "Medium",
    color: "text-yellow-600",
    bg: "bg-yellow-50 border-yellow-200",
    badge: "secondary" as const,
    emoji: "🟡",
  },
  LOW: {
    label: "Low",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    badge: "outline" as const,
    emoji: "🔵",
  },
  INFO: {
    label: "Info",
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    badge: "outline" as const,
    emoji: "⚪",
  },
};

// Category icons
const categoryIcons = {
  BUG: AlertTriangle,
  SECURITY: Shield,
  PERFORMANCE: Zap,
  STYLE: Code,
  MAINTAINABILITY: Wrench,
};

async function getReview(id: string) {
  return prisma.review.findUnique({
    where: { id },
    include: {
      repository: { select: { fullName: true } },
      findings: {
        orderBy: [
          { severity: "asc" }, // CRITICAL first
          { filePath: "asc" },
        ],
      },
    },
  });
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await getReview(id);

  if (!review) notFound();

  // Group findings by file
  const findingsByFile = review.findings.reduce(
    (acc, finding) => {
      if (!acc[finding.filePath]) {
        acc[finding.filePath] = [];
      }
      acc[finding.filePath].push(finding);
      return acc;
    },
    {} as Record<string, typeof review.findings>
  );

  // Count by severity
  const severityCounts = {
    CRITICAL: review.findings.filter((f) => f.severity === "CRITICAL").length,
    HIGH: review.findings.filter((f) => f.severity === "HIGH").length,
    MEDIUM: review.findings.filter((f) => f.severity === "MEDIUM").length,
    LOW: review.findings.filter((f) => f.severity === "LOW").length,
    INFO: review.findings.filter((f) => f.severity === "INFO").length,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/reviews"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to reviews
      </Link>

      {/* PR Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {review.prTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {review.repository.fullName}
        </p>
      </div>

      {/* PR Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Pull Request</p>
                <p className="text-sm font-medium">#{review.prNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Author</p>
                <p className="text-sm font-medium">{review.prAuthor}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Commit</p>
                <p className="text-sm font-mono">
                  {review.commitSha.slice(0, 7)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reviewed</p>
                <p className="text-sm font-medium">
                  {formatDistanceToNow(new Date(review.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score + Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Overall Score */}
        <Card className="sm:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-5xl font-bold ${getScoreColor(
                review.overallScore ?? 0
              )}`}
            >
              {review.overallScore ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </CardContent>
        </Card>

        {/* Severity Breakdown */}
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Findings Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(severityCounts).map(([severity, count]) => {
                const config =
                  severityConfig[severity as keyof typeof severityConfig];
                return (
                  <div key={severity} className="text-center">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className={`text-xs font-medium ${config.color}`}>
                      {config.emoji} {config.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {review.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Review Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {review.summary}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Findings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Findings ({review.findings.length})
        </h2>

        {review.findings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No findings — clean code! 🎉
              </p>
            </CardContent>
          </Card>
        ) : (
          // Group by file
          Object.entries(findingsByFile).map(([filePath, findings]) => (
            <Card key={filePath}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-muted-foreground">
                  📄 {filePath}
                  <span className="ml-2 font-sans font-normal">
                    ({findings.length}{" "}
                    {findings.length === 1 ? "issue" : "issues"})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {findings.map((finding) => {
                  const severity =
                    severityConfig[
                      finding.severity as keyof typeof severityConfig
                    ];
                  const CategoryIcon =
                    categoryIcons[
                      finding.category as keyof typeof categoryIcons
                    ] ?? AlertTriangle;

                  return (
                    <div
                      key={finding.id}
                      className={`rounded-lg border p-4 ${severity.bg}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <CategoryIcon
                            className={`h-4 w-4 flex-shrink-0 ${severity.color}`}
                          />
                          <p className="text-sm font-medium">
                            {finding.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={severity.badge}>
                            {severity.emoji} {severity.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {finding.category.toLowerCase()}
                          </Badge>
                        </div>
                      </div>

                      {finding.lineStart && (
                        <p className="text-xs text-muted-foreground mb-2 font-mono">
                          Line {finding.lineStart}
                          {finding.lineEnd &&
                            finding.lineEnd !== finding.lineStart &&
                            `–${finding.lineEnd}`}
                        </p>
                      )}

                      <p className="text-sm text-gray-700 mb-3">
                        {finding.description}
                      </p>

                      {finding.suggestion && (
                        <div className="rounded-md bg-white/70 border border-current/20 p-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            💡 Suggestion
                          </p>
                          <p className="text-sm text-gray-700">
                            {finding.suggestion}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}