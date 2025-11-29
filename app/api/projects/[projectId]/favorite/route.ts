import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function POST(_req: Request, context: { params: Promise<{ projectId: string }> }) {
  const session = await requireSession();
  const { projectId } = await context.params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      team: { members: { some: { userId: session.user.id, deletedAt: null } }, deletedAt: null },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.projectFavorite.findUnique({ where: { projectId_userId: { projectId, userId: session.user.id } } });
  if (existing) {
    await prisma.projectFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorite: false });
  }

  await prisma.projectFavorite.create({ data: { projectId, userId: session.user.id } });
  return NextResponse.json({ favorite: true });
}
