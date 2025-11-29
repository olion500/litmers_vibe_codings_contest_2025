import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { requireTeamMembership, canManageTeam } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import { logTeamActivity } from "@/lib/activity";

export async function POST(_req: Request, context: { params: Promise<{ teamId: string; memberId: string }> }) {
  const session = await requireSession();
  const { teamId, memberId } = await context.params;
  const { membership } = await requireTeamMembership(teamId, session.user.id);

  if (!canManageTeam(membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.teamMember.findFirst({ where: { id: memberId, teamId, deletedAt: null }, include: { user: true } });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (target.role === "OWNER") return NextResponse.json({ error: "Cannot kick owner" }, { status: 400 });
  if (target.role === "ADMIN" && membership.role !== "OWNER") return NextResponse.json({ error: "Only owner can remove admins" }, { status: 403 });

  await prisma.teamMember.update({ where: { id: target.id }, data: { deletedAt: new Date() } });
  await logTeamActivity(teamId, session.user.id, "member_removed", `${session.user.email} removed ${target.user.email}`);

  return NextResponse.json({ success: true });
}
