import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/issues";
import { statusSchemas } from "@/lib/validation";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Unable to update");

export async function PATCH(req: Request, context: { params: Promise<{ projectId: string; statusId: string }> }) {
  const { projectId, statusId } = await context.params;
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = statusSchemas.updateWip.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await requireProjectAccess(projectId, session.user.id);

  try {
    const status = await prisma.status.update({ where: { id: statusId, projectId: projectId }, data: { wipLimit: parsed.data.wipLimit } });
    return NextResponse.json({ status });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}
