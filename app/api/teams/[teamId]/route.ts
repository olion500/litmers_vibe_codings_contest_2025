import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { teamSchemas } from "@/lib/validation";
import { requireSession } from "@/lib/session";
import { requireTeamMembership, canManageTeam } from "@/lib/teams";
import { logTeamActivity } from "@/lib/activity";

export async function PATCH(req: Request, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params;
  const session = await requireSession();
  const membership = await requireTeamMembership(teamId, session.user.id);
  if (!canManageTeam(membership.membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = teamSchemas.rename.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { name: parsed.data.name },
  });

  await logTeamActivity(teamId, session.user.id, "team_renamed", `${session.user.email} renamed the team to ${parsed.data.name}`);

  return NextResponse.json({ team: updated });
}

export async function DELETE(_req: Request, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params;
  const session = await requireSession();
  const membership = await requireTeamMembership(teamId, session.user.id);
  if (membership.membership.role !== "OWNER") return NextResponse.json({ error: "Only owner can delete" }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
    await tx.teamMember.updateMany({ where: { teamId }, data: { deletedAt: new Date() } });
    await tx.teamInvite.deleteMany({ where: { teamId } });
    await logTeamActivity(teamId, session.user.id, "team_deleted", `${session.user.email} deleted the team`);
  });

  return NextResponse.json({ success: true });
}
