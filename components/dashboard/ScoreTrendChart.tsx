// components/dashboard/ScoreTrendChart.tsx
// Line chart showing code quality score trend over recent reviews.
// Must be a Client Component — Recharts uses browser APIs.

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface TrendDataPoint {
  review: string;
  score: number;
  index: number;
}

interface ScoreTrendChartProps {
  data: TrendDataPoint[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#ca8a04";
  return "#dc2626";
}

// Custom tooltip shown on hover
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;

  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className="text-lg font-bold"
        style={{ color: getScoreColor(score) }}
      >
        {score}/100
      </p>
      <p className="text-xs text-muted-foreground">
        {score >= 80 ? "Good" : score >= 60 ? "Needs work" : "Critical issues"}
      </p>
    </div>
  );
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            Score Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-sm text-muted-foreground">
            Complete reviews to see your score trend
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          Score Trend
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Last {data.length} reviews
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="review"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Reference lines for score thresholds */}
            <ReferenceLine
              y={80}
              stroke="#16a34a"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />
            <ReferenceLine
              y={60}
              stroke="#ca8a04"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#7c3aed"
              strokeWidth={2.5}
              dot={{ fill: "#7c3aed", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#7c3aed" }}
            />
          </LineChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-green-600" />
            Good (80+)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-yellow-600" />
            Needs work (60-79)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-red-600" />
            Critical (&lt;60)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}