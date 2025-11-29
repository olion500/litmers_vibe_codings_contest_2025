import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/invites/[token]
 * Retrieve invite details (public endpoint, no auth required)
 * Used to display invite info before accepting
 */
export async function GET(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  // Return public info only (don't expose sensitive data)
  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      teamId: invite.teamId,
      expiresAt: invite.expiresAt,
      team: {
        name: invite.team.name,
      },
    },
  });
}
