import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { projectSchemas } from "@/lib/validation";
import { TeamRole } from "@prisma/client";

const PROJECT_LIMIT = 15;

export async function GET(req: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  const projects = await prisma.project.findMany({
    where: {
      teamId: teamId || undefined,
      deletedAt: null,
      team: {
        members: { some: { userId: session.user.id, deletedAt: null } },
        deletedAt: null,
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      favorites: { where: { userId: session.user.id } },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = projectSchemas.create.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const membership = await prisma.teamMember.findFirst({
    where: { teamId: parsed.data.teamId, userId: session.user.id, deletedAt: null, team: { deletedAt: null } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (membership.role === TeamRole.MEMBER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await prisma.project.count({ where: { teamId: parsed.data.teamId, deletedAt: null } });
  if (count >= PROJECT_LIMIT) return NextResponse.json({ error: "Project limit reached" }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      teamId: parsed.data.teamId,
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
