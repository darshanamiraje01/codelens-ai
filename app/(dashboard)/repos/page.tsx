// app/(dashboard)/repos/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GitPullRequest, CheckCircle, XCircle } from "lucide-react";
import prisma from "@/lib/db";
import { ToggleRepoButton } from "@/components/repos/ToggleRepoButton";

async function getRepositories() {
  return prisma.repository.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { reviews: true },
      },
    },
  });
}

export default async function ReposPage() {
  const repositories = await getRepositories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground">
          Manage which repositories CodeLens AI reviews
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{repositories.length}</p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {repositories.filter((r) => r.isActive).length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <GitPullRequest className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                {repositories.reduce((sum, r) => sum + r._count.reviews, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Reviews</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repository list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Connected Repositories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {repositories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">No repositories connected</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Install the CodeLens AI GitHub App on your repositories to
                start getting automated code reviews.
              </p>
              
                <a href="https://github.com/apps/codelensai-darshana"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 text-xs text-primary hover:underline"
              >
                Install GitHub App
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{repo.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {repo._count.reviews}{" "}
                        {repo._count.reviews === 1 ? "review" : "reviews"}
                        {repo.language && ` · ${repo.language}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={repo.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {repo.isActive ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </Badge>
                    <ToggleRepoButton
                      repoId={repo.id}
                      isActive={repo.isActive}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}