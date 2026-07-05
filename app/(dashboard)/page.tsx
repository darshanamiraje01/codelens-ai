// app/(dashboard)/page.tsx
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentReviews } from "@/components/dashboard/RecentReviews";
import { ScoreTrendChart } from "@/components/dashboard/ScoreTrendChart";
import { SeverityBreakdown } from "@/components/dashboard/SeverityBreakdown";
import { TriggerReview } from "@/components/dashboard/TriggerReview";
import prisma from "@/lib/db";

async function getDashboardData() {
  const [
    totalReviews,
    completedReviews,
    totalFindings,
    recentReviews,
    avgScoreResult,
    allCompletedReviews,
    findingsBySeverity,
    repositories,
  ] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { status: "COMPLETED" } }),
    prisma.finding.count(),
    prisma.review.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { repository: { select: { fullName: true } } },
    }),
    prisma.review.aggregate({
      where: { status: "COMPLETED", overallScore: { not: null } },
      _avg: { overallScore: true },
    }),
    // For the trend chart — last 10 completed reviews with scores
    prisma.review.findMany({
      where: { status: "COMPLETED", overallScore: { not: null } },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        overallScore: true,
        createdAt: true,
        prNumber: true,
      },
    }),
    // Findings grouped by severity
    prisma.finding.groupBy({
      by: ["severity"],
      _count: { severity: true },
    }),
    prisma.repository.findMany({
      where: { isActive: true },
      select: { fullName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const avgScore = Math.round(avgScoreResult._avg.overallScore ?? 0);

  // Format for chart
  const trendData = allCompletedReviews.map((r, index) => ({
    review: `PR #${r.prNumber}`,
    score: r.overallScore ?? 0,
    index: index + 1,
  }));

  // Format severity breakdown
  const severityData = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map(
    (sev) => ({
      severity: sev,
      count:
        findingsBySeverity.find((f) => f.severity === sev)?._count.severity ??
        0,
    })
  );

  return {
    totalReviews,
    completedReviews,
    totalFindings,
    recentReviews,
    avgScore,
    trendData,
    severityData,
    repositories,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your code review activity
        </p>
      </div>

      <StatsCards
        totalReviews={data.totalReviews}
        completedReviews={data.completedReviews}
        totalFindings={data.totalFindings}
        avgScore={data.avgScore}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Score trend chart — takes 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <ScoreTrendChart data={data.trendData} />
        </div>

        {/* Severity breakdown — takes 1/3 width */}
        <div className="lg:col-span-1">
          <SeverityBreakdown data={data.severityData} />
        </div>
      </div>
      {/* Manual trigger */}
      <TriggerReview repositories={data.repositories} />

      <RecentReviews reviews={data.recentReviews} />
    </div>
  );
}