import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createStatus, reorderStatuses, requireProjectAccess } from "@/lib/issues";
import { issueSchemas } from "@/lib/validation";

const errorMessage = (err: unknown, fallback = "Unable to create status") => (err instanceof Error ? err.message : fallback);

export async function GET(_: Request, { params }: { params: { projectId: string } }) {
  const session = await requireSession();
  await requireProjectAccess(params.projectId, session.user.id);
  const statuses = await prisma.status.findMany({ where: { projectId: params.projectId, deletedAt: null }, orderBy: { position: "asc" } });
  return NextResponse.json({ statuses });
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = issueSchemas.createStatus.safeParse({ ...body, projectId: params.projectId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const status = await createStatus(params.projectId, session.user.id, parsed.data.name, parsed.data.color, parsed.data.wipLimit);
    return NextResponse.json({ status }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: { projectId: string } }) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = issueSchemas.reorderStatuses.safeParse({ ...body, projectId: params.projectId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    await reorderStatuses(params.projectId, session.user.id, parsed.data.order);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, "Unable to reorder") }, { status: 400 });
  }
}
