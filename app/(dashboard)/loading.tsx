// app/(dashboard)/loading.tsx
// Skeleton loading state shown during page transitions and
// initial data fetching in Server Components.
// Next.js automatically shows this while the page is loading.

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border bg-card p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-55 w-full" />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-55 w-full" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}