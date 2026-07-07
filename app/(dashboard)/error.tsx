// app/(dashboard)/error.tsx
// Error boundary for the dashboard route group.
// Catches runtime errors and shows a user-friendly message.
// Must be a Client Component — uses React error boundary pattern.

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <div className="rounded-full bg-red-50 p-6">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm">
          An unexpected error occurred. Try refreshing the page.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}