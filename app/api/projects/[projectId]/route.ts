import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectSchemas } from "@/lib/validation";
import { requireSession } from "@/lib/session";
import { TeamRole } from "@prisma/client";

async function assertEditable(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: { team: { include: { members: { where: { userId, deletedAt: null } } } } },
  });
  if (!project || project.team.deletedAt) return null;
  const membership = project.team.members[0];
  if (!membership) return null;
  return { project, membership };
}

export async function PATCH(req: Request, context: { params: Promise<{ projectId: string }> }) {
  const session = await requireSession();
  const { projectId } = await context.params;
  const editable = await assertEditable(projectId, session.user.id);
  if (!editable) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (editable.membership.role === TeamRole.MEMBER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = projectSchemas.update.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name: parsed.data.name, description: parsed.data.description },
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: Request, context: { params: Promise<{ projectId: string }> }) {
  const session = await requireSession();
  const { projectId } = await context.params;
  const editable = await assertEditable(projectId, session.user.id);
  if (!editable) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (editable.membership.role !== TeamRole.OWNER) return NextResponse.json({ error: "Only owner can delete" }, { status: 403 });

  await prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}

export async function POST(_req: Request, context: { params: Promise<{ projectId: string }> }) {
  const session = await requireSession();
  const { projectId } = await context.params;
  const editable = await assertEditable(projectId, session.user.id);
  if (!editable) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (editable.membership.role === TeamRole.MEMBER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isArchived = !!editable.project.archivedAt;
  const updated = await prisma.project.update({ where: { id: projectId }, data: { archivedAt: isArchived ? null : new Date() } });
  return NextResponse.json({ project: updated });
}
