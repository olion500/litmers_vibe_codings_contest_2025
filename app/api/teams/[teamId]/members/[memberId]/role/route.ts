import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { requireTeamMembership } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import { teamSchemas } from "@/lib/validation";
import { logTeamActivity } from "@/lib/activity";

export async function POST(req: Request, context: { params: Promise<{ teamId: string; memberId: string }> }) {
  const session = await requireSession();
  const { teamId, memberId } = await context.params;
  const { membership } = await requireTeamMembership(teamId, session.user.id);

  if (membership.role !== "OWNER") return NextResponse.json({ error: "Only owner can change roles" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = teamSchemas.changeRole.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const target = await prisma.teamMember.findFirst({ where: { id: memberId, teamId, deletedAt: null }, include: { user: true } });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (target.userId === membership.userId && parsed.data.role !== "OWNER") {
    // owner demoting self without transferring is blocked
    return NextResponse.json({ error: "Transfer ownership to another member first" }, { status: 400 });
  }

  if (parsed.data.role === "OWNER") {
    await prisma.$transaction(async (tx) => {
      await tx.teamMember.update({ where: { id: target.id }, data: { role: "OWNER" } });
      await tx.team.update({ where: { id: teamId }, data: { ownerId: target.userId } });
      await tx.teamMember.update({ where: { id: membership.id }, data: { role: "ADMIN" } });
    });
    await logTeamActivity(teamId, session.user.id, "ownership_transferred", `${session.user.email} transferred ownership to ${target.user.email}`);
    return NextResponse.json({ success: true, role: "OWNER" });
  }

  await prisma.teamMember.update({ where: { id: target.id }, data: { role: parsed.data.role } });
  await logTeamActivity(teamId, session.user.id, "role_changed", `${session.user.email} set ${target.user.email} role to ${parsed.data.role}`);

  return NextResponse.json({ success: true, role: parsed.data.role });
}
