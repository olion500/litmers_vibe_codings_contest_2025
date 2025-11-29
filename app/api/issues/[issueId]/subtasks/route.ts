import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { issueSchemas } from "@/lib/validation";
import { createSubtask } from "@/lib/issues";
import { prisma } from "@/lib/prisma";

const errorMessage = (err: unknown, fallback = "Unable to update subtask") => (err instanceof Error ? err.message : fallback);

export async function POST(req: Request, context: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await context.params;
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = issueSchemas.subtask.safeParse({ ...body, issueId: issueId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const subtask = await createSubtask(issueId, session.user.id, parsed.data.title);
    return NextResponse.json({ subtask }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, "Unable to create subtask") }, { status: 400 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await context.params;
  await requireSession();
  const body = await req.json().catch(() => null);
  if (!body?.subtaskId) return NextResponse.json({ error: "subtaskId required" }, { status: 400 });
  const parsed = issueSchemas.updateSubtask.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const subtask = await prisma.subtask.findFirst({ where: { id: parsed.data.subtaskId, issueId: issueId } });
  if (!subtask) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const updated = await prisma.subtask.update({ where: { id: parsed.data.subtaskId }, data: { title: parsed.data.title, completed: parsed.data.completed } });
    return NextResponse.json({ subtask: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}
