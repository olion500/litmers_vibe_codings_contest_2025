import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createLabel, requireProjectAccess } from "@/lib/issues";
import { issueSchemas } from "@/lib/validation";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Unable to create label");

export async function GET(_: Request, { params }: { params: { projectId: string } }) {
  const session = await requireSession();
  await requireProjectAccess(params.projectId, session.user.id);
  const labels = await prisma.projectLabel.findMany({ where: { projectId: params.projectId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ labels });
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = issueSchemas.createLabel.safeParse({ ...body, projectId: params.projectId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const label = await createLabel(params.projectId, session.user.id, parsed.data.name, parsed.data.color);
    return NextResponse.json({ label }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}
