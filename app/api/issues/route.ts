import { NextResponse } from "next/server";
import { issueSchemas } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { createIssue, requireProjectAccess } from "@/lib/issues";
import type { Prisma } from "@prisma/client";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Unable to create issue");

export async function GET(req: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  await requireProjectAccess(projectId, session.user.id);

  const statusIds = searchParams.getAll("statusId");
  const labelIds = searchParams.getAll("labelId");
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 100);
  const filters: Prisma.IssueWhereInput = {
    projectId,
    deletedAt: null,
  };
  if (statusIds.length) filters.statusId = { in: statusIds };
  if (searchParams.get("assigneeId")) filters.assigneeId = searchParams.get("assigneeId")!;
  const priority = searchParams.get("priority");
  if (priority) filters.priority = priority as any;
  if (searchParams.get("hasDue")) filters.dueDate = searchParams.get("hasDue") === "true" ? { not: null } : null;
  const dueFrom = searchParams.get("dueFrom");
  const dueTo = searchParams.get("dueTo");
  if (dueFrom || dueTo) {
    filters.dueDate = {
      gte: dueFrom ? new Date(dueFrom) : undefined,
      lte: dueTo ? new Date(dueTo) : undefined,
    };
  }

  if (labelIds.length) {
    filters.labels = { some: { labelId: { in: labelIds } } };
  }

  const text = searchParams.get("search");
  if (text) filters.title = { contains: text, mode: "insensitive" };

  const sort = searchParams.get("sort") ?? "createdAt";
  const total = await prisma.issue.count({ where: filters });

  const issues = await prisma.issue.findMany({
    where: filters,
    include: {
      status: true,
      labels: { include: { label: true } },
      subtasks: true,
    },
    orderBy: sort === "priority" ? { priority: "asc" } : { [sort]: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({ issues, page, pageSize, total });
}

export async function POST(req: Request) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = issueSchemas.create.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const issue = await createIssue({ ...parsed.data, userId: session.user.id });
    return NextResponse.json({ issue }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}
