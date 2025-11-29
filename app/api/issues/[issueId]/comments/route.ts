import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { commentSchemas } from "@/lib/validation";
import { createComment, requireIssueWithMembership } from "@/lib/comments";

const errorMessage = (err: unknown, fallback = "Unable to create comment") => (err instanceof Error ? err.message : fallback);

export async function GET(req: Request, { params }: { params: { issueId: string } }) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);

  const access = await requireIssueWithMembership(params.issueId, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const where = { issueId: params.issueId, deletedAt: null } as const;
  const total = await prisma.comment.count({ where });
  const comments = await prisma.comment.findMany({
    where,
    include: { author: true },
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({ comments, page, pageSize, total });
}

export async function POST(req: Request, { params }: { params: { issueId: string } }) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = commentSchemas.create.safeParse({ ...body, issueId: params.issueId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const comment = await createComment(params.issueId, session.user.id, parsed.data.content);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}
