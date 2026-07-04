// components/dashboard/TriggerReview.tsx
// Form to manually trigger a PR review from the dashboard.
// Client Component — needs useState for form state and fetch for API call.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface TriggerReviewProps {
  repositories: Array<{ fullName: string }>;
}

export function TriggerReview({ repositories }: TriggerReviewProps) {
  const [repoFullName, setRepoFullName] = useState(
    repositories[0]?.fullName ?? ""
  );
  const [prNumber, setPrNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repoFullName || !prNumber) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/reviews/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName,
          prNumber: Number(prNumber),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: "success",
          message: `Review queued! Job ID: ${data.jobId}`,
        });
        setPrNumber("");
      } else {
        setResult({
          type: "error",
          message: data.error ?? "Failed to trigger review",
        });
      }
    } catch {
      setResult({
        type: "error",
        message: "Network error — is the server running?",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Trigger Manual Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Repository selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Repository
            </label>
            {repositories.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No repositories connected yet. Install the GitHub App on a repo first.
              </p>
            ) : (
              <select
                value={repoFullName}
                onChange={(e) => setRepoFullName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {repositories.map((repo) => (
                  <option key={repo.fullName} value={repo.fullName}>
                    {repo.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PR number input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Pull Request Number
            </label>
            <input
              type="number"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              placeholder="e.g. 42"
              min="1"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isLoading || !prNumber || repositories.length === 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Queuing review...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Trigger Review
              </>
            )}
          </Button>

          {/* Result message */}
          {result && (
            <div
              className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                result.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result.type === "success" ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              )}
              <p>{result.message}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}