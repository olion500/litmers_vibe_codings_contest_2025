import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { requireTeamMembership, canManageTeam } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import { sendTeamInviteEmail } from "@/lib/mailer";
import crypto from "node:crypto";

/**
 * POST /api/teams/[teamId]/invites/[inviteId]/resend
 * Resend a team invitation to an invite recipient
 * Requires OWNER or ADMIN role
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ teamId: string; inviteId: string }> }
) {
  const session = await requireSession();
  const { teamId, inviteId } = await context.params;
  const { team, membership } = await requireTeamMembership(teamId, session.user.id);

  if (!canManageTeam(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get the invite
  const invite = await prisma.teamInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite || invite.teamId !== teamId) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  // Generate new token and reset expiration
  const newToken = crypto.randomBytes(24).toString("hex");
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const updatedInvite = await prisma.teamInvite.update({
    where: { id: inviteId },
    data: {
      token: newToken,
      expiresAt: newExpiresAt,
      acceptedAt: null, // Reset acceptance if already accepted
    },
  });

  // Send email with new token
  await sendTeamInviteEmail(invite.email, team.name, newToken, session.user.name || session.user.email);

  return NextResponse.json({ invite: updatedInvite });
}
