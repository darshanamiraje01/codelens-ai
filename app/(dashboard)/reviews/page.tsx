// app/(dashboard)/reviews/page.tsx
// Paginated list of all reviews across all repositories.
// Server Component — fetches directly from Prisma.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { GitPullRequest, Clock, CheckCircle, XCircle } from "lucide-react";
import prisma from "@/lib/db";

const statusConfig = {
  COMPLETED: {
    label: "Completed",
    variant: "default" as const,
    icon: CheckCircle,
    color: "text-green-500",
  },
  PROCESSING: {
    label: "Processing",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-blue-500",
  },
  PENDING: {
    label: "Pending",
    variant: "outline" as const,
    icon: Clock,
    color: "text-yellow-500",
  },
  FAILED: {
    label: "Failed",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-500",
  },
};

function getScoreColor(score: number | null): string {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-green-600 font-semibold";
  if (score >= 60) return "text-yellow-600 font-semibold";
  return "text-red-600 font-semibold";
}

async function getReviews() {
  return prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      repository: { select: { fullName: true } },
      findings: { select: { severity: true } },
    },
  });
}

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          All pull request reviews across your repositories
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = reviews.filter((r) => r.status === status).length;
          const Icon = config.icon;
          return (
            <Card key={status}>
              <CardContent className="flex items-center gap-3 pt-6">
                <Icon className={`h-5 w-5 ${config.color}`} />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">
                    {config.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reviews table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GitPullRequest className="h-4 w-4" />
            All Reviews ({reviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitPullRequest className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No reviews yet. Open a pull request on a connected repo.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pull Request</TableHead>
                  <TableHead>Repository</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => {
                  const status =
                    statusConfig[
                      review.status as keyof typeof statusConfig
                    ] ?? statusConfig.PENDING;

                  // Count findings by severity
                  const criticalCount = review.findings.filter(
                    (f) => f.severity === "CRITICAL"
                  ).length;
                  const highCount = review.findings.filter(
                    (f) => f.severity === "HIGH"
                  ).length;

                  return (
                    <TableRow
                      key={review.id}
                      className="hover:bg-muted/50 cursor-pointer"
                    >
                      <TableCell>
                        <Link href={`/reviews/${review.id}`}>
                          <p className="font-medium text-sm hover:text-primary transition-colors truncate max-w-50">
                            {review.prTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PR #{review.prNumber} · {review.prAuthor}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground truncate max-w-35">
                          {review.repository.fullName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {criticalCount > 0 && (
                            <span className="text-xs font-medium text-red-600">
                              {criticalCount} critical
                            </span>
                          )}
                          {highCount > 0 && (
                            <span className="text-xs font-medium text-orange-600">
                              {highCount} high
                            </span>
                          )}
                          {review.findings.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              None
                            </span>
                          )}
                          {review.findings.length > 0 &&
                            criticalCount === 0 &&
                            highCount === 0 && (
                              <span className="text-xs text-muted-foreground">
                                {review.findings.length} minor
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm ${getScoreColor(
                            review.overallScore
                          )}`}
                        >
                          {review.overallScore
                            ? `${review.overallScore}/100`
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {review.durationMs
                            ? `${(review.durationMs / 1000).toFixed(1)}s`
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(review.createdAt),
                            { addSuffix: true }
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}