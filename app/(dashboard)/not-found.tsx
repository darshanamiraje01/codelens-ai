// app/(dashboard)/not-found.tsx
// Shown when a page or resource is not found (404).
// Automatically used by Next.js when notFound() is called.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground max-w-sm">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}