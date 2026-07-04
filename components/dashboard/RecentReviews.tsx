// components/dashboard/RecentReviews.tsx
// Shows the 5 most recent reviews in a clean table format.

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

// Status badge styling
const statusConfig = {
  COMPLETED: { label: "Completed", variant: "default" as const },
  PROCESSING: { label: "Processing", variant: "secondary" as const },
  PENDING: { label: "Pending", variant: "outline" as const },
  FAILED: { label: "Failed", variant: "destructive" as const },
};

// Score color based on value
function getScoreColor(score: number | null): string {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

interface Review {
  id: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  status: string;
  overallScore: number | null;
  createdAt: Date;
  repository: {
    fullName: string;
  };
}

interface RecentReviewsProps {
  reviews: Review[];
}

export function RecentReviews({ reviews }: RecentReviewsProps) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Recent Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No reviews yet. Open a pull request on a connected repository
              to trigger your first review.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Recent Reviews
        </CardTitle>
        <Link
          href="/reviews"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pull Request</TableHead>
              <TableHead>Repository</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => {
              const status =
                statusConfig[review.status as keyof typeof statusConfig] ??
                statusConfig.PENDING;

              return (
                <TableRow key={review.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link
                      href={`/reviews/${review.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      <p className="font-medium text-sm truncate max-w-[200px]">
                        {review.prTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PR #{review.prNumber} by {review.prAuthor}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {review.repository.fullName}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-sm font-medium ${getScoreColor(
                        review.overallScore
                      )}`}
                    >
                      {review.overallScore
                        ? `${review.overallScore}/100`
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}