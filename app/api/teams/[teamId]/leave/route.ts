import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { requireTeamMembership } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import { logTeamActivity } from "@/lib/activity";

export async function POST(_req: Request, context: { params: Promise<{ teamId: string }> }) {
  const session = await requireSession();
  const { teamId } = await context.params;
  const { membership } = await requireTeamMembership(teamId, session.user.id);

  if (membership.role === "OWNER") {
    return NextResponse.json({ error: "Owner cannot leave. Transfer or delete team." }, { status: 400 });
  }

  await prisma.teamMember.update({ where: { id: membership.id }, data: { deletedAt: new Date() } });
  await logTeamActivity(teamId, session.user.id, "member_left", `${session.user.email} left the team`);

  return NextResponse.json({ success: true });
}
