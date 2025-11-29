import { NextResponse } from "next/server";
import { issueSchemas } from "@/lib/validation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { softDeleteIssue, updateIssue } from "@/lib/issues";

const errorMessage = (err: unknown, fallback = "Unable to update") => (err instanceof Error ? err.message : fallback);

export async function GET(_: Request, context: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await context.params;
  const session = await requireSession();
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null, project: { team: { members: { some: { userId: session.user.id, deletedAt: null } } } } },
    include: {
      status: true,
      labels: { include: { label: true } },
      subtasks: true,
      histories: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ issue });
}

export async function PATCH(req: Request, context: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await context.params;
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = issueSchemas.update.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const updated = await updateIssue(issueId, session.user.id, parsed.data);
    return NextResponse.json({ issue: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await context.params;
  const session = await requireSession();
  try {
    await softDeleteIssue(issueId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, "Unable to delete") }, { status: 400 });
  }
}
