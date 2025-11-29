import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { TeamRole } from "@prisma/client";
import { logTeamActivity } from "@/lib/activity";

export async function POST(_req: Request, context: { params: Promise<{ token: string }> }) {
  const session = await requireSession();
  const { token } = await context.params;

  const invite = await prisma.teamInvite.findUnique({ where: { token }, include: { team: true } });
  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite invalid or expired" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

    const existing = await tx.teamMember.findUnique({
      where: { teamId_userId: { teamId: invite.teamId, userId: session.user.id } },
    });
    if (existing) {
      if (existing.deletedAt) {
        await tx.teamMember.update({ where: { id: existing.id }, data: { deletedAt: null, role: existing.role } });
      }
      return;
    }

    await tx.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId: session.user.id,
        role: TeamRole.MEMBER,
      },
    });
  });

  await logTeamActivity(invite.teamId, session.user.id, "invite_accepted", `${session.user.email} joined ${invite.team.name}`);

  return NextResponse.json({ success: true, teamId: invite.teamId });
}
