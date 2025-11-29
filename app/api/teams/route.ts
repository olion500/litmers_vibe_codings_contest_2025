import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { teamSchemas } from "@/lib/validation";
import { requireSession } from "@/lib/session";
import { logTeamActivity } from "@/lib/activity";
import { TeamRole } from "@prisma/client";

export async function GET() {
  const session = await requireSession();

  const teams = await prisma.teamMember.findMany({
    where: { userId: session.user.id, deletedAt: null, team: { deletedAt: null } },
    include: {
      team: true,
    },
  });

  return NextResponse.json({ teams });
}

export async function POST(req: Request) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = teamSchemas.create.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        name: parsed.data.name,
        ownerId: session.user.id,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: created.id,
        userId: session.user.id,
        role: TeamRole.OWNER,
      },
    });

    await logTeamActivity(created.id, session.user.id, "team_created", `${session.user.email} created the team`);

    return created;
  });

  return NextResponse.json({ team }, { status: 201 });
}
