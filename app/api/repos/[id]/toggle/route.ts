// app/api/repos/[id]/toggle/route.ts
// Toggles a repository's active status.
// Active repos receive automatic PR reviews.
// Inactive repos are ignored by the webhook handler.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config-actions";
import prisma from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const repo = await prisma.repository.findUnique({
    where: { id },
  });

  if (!repo) {
    return NextResponse.json(
      { error: "Repository not found" },
      { status: 404 }
    );
  }

  // Toggle the active status
  const updated = await prisma.repository.update({
    where: { id },
    data: { isActive: !repo.isActive },
  });

  return NextResponse.json({
    success: true,
    isActive: updated.isActive,
  });
}