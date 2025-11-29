import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { requireTeamMembership, canManageTeam } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import { teamSchemas } from "@/lib/validation";
import { sendTeamInviteEmail } from "@/lib/mailer";
import crypto from "node:crypto";
import { logTeamActivity } from "@/lib/activity";

export async function POST(req: Request, context: { params: Promise<{ teamId: string }> }) {
  const session = await requireSession();
  const { teamId } = await context.params;
  const { team, membership } = await requireTeamMembership(teamId, session.user.id);
  if (!canManageTeam(membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = teamSchemas.invite.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.teamInvite.upsert({
    where: { teamId_email: { teamId, email: parsed.data.email } },
    update: { token, expiresAt, acceptedAt: null, createdById: session.user.id },
    create: {
      teamId,
      email: parsed.data.email,
      token,
      expiresAt,
      createdById: session.user.id,
    },
  });

  await sendTeamInviteEmail(parsed.data.email, team.name, token);
  await logTeamActivity(teamId, session.user.id, "invite_sent", `${session.user.email} invited ${parsed.data.email}`);

  return NextResponse.json({ invite });
}
