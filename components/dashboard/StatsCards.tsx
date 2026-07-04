// components/dashboard/StatsCards.tsx
// Displays four key metrics at the top of the dashboard.
// Receives pre-fetched data as props from the Server Component page.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitPullRequest, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";

interface StatsCardsProps {
  totalReviews: number;
  completedReviews: number;
  totalFindings: number;
  avgScore: number;
}

export function StatsCards({
  totalReviews,
  completedReviews,
  totalFindings,
  avgScore,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Reviews",
      value: totalReviews,
      description: "Pull requests reviewed",
      icon: GitPullRequest,
      color: "text-blue-500",
    },
    {
      title: "Completed",
      value: completedReviews,
      description: "Successfully reviewed",
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Total Findings",
      value: totalFindings,
      description: "Issues identified by AI",
      icon: AlertTriangle,
      color: "text-yellow-500",
    },
    {
      title: "Average Score",
      value: avgScore > 0 ? `${avgScore}/100` : "N/A",
      description: "Code quality score",
      icon: BarChart3,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}