// components/dashboard/SeverityBreakdown.tsx
// Donut chart showing findings breakdown by severity.

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const SEVERITY_CONFIG = {
  CRITICAL: { label: "Critical", color: "#dc2626", emoji: "🔴" },
  HIGH: { label: "High", color: "#ea580c", emoji: "🟠" },
  MEDIUM: { label: "Medium", color: "#ca8a04", emoji: "🟡" },
  LOW: { label: "Low", color: "#2563eb", emoji: "🔵" },
  INFO: { label: "Info", color: "#6b7280", emoji: "⚪" },
};

interface SeverityData {
  severity: string;
  count: number;
}

interface SeverityBreakdownProps {
  data: SeverityData[];
}

export function SeverityBreakdown({ data }: SeverityBreakdownProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      ...d,
      config: SEVERITY_CONFIG[d.severity as keyof typeof SEVERITY_CONFIG],
    }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Findings by Severity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-[220px]">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-sm text-muted-foreground text-center">
              No findings yet
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.config?.color ?? "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value} findings`,
                    SEVERITY_CONFIG[name as keyof typeof SEVERITY_CONFIG]
                      ?.label ?? name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2 mt-2">
              {data.map((item) => {
                const config =
                  SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG];
                return (
                  <div
                    key={item.severity}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config?.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {config?.emoji} {config?.label}
                      </span>
                    </div>
                    <span className="text-xs font-medium">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}