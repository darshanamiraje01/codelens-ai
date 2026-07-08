// components/repos/ToggleRepoButton.tsx
// Button to activate or deactivate reviews for a repository.
// Client Component — handles optimistic UI and API call.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ToggleRepoButtonProps {
  repoId: string;
  isActive: boolean;
}

export function ToggleRepoButton({ repoId, isActive }: ToggleRepoButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setIsLoading(true);
    try {
      await fetch(`/api/repos/${repoId}/toggle`, {
        method: "POST",
      });
      // Refresh the page to show updated state
      router.refresh();
    } catch (error) {
      console.error("Failed to toggle repo:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant={isActive ? "outline" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isActive ? (
        "Deactivate"
      ) : (
        "Activate"
      )}
    </Button>
  );
}