import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authSchemas } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { TeamRole } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = authSchemas.register.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password, name } = parsed.data;
  const inviteToken = body.inviteToken as string | undefined;

  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  // Create user and optionally handle invite token
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    // If invite token provided, add user to team and mark invite as accepted
    if (inviteToken) {
      const invite = await tx.teamInvite.findUnique({
        where: { token: inviteToken },
      });

      if (invite && invite.expiresAt > new Date()) {
        // Add user to team
        const existing = await tx.teamMember.findUnique({
          where: { teamId_userId: { teamId: invite.teamId, userId: newUser.id } },
        });

        if (!existing) {
          await tx.teamMember.create({
            data: {
              teamId: invite.teamId,
              userId: newUser.id,
              role: TeamRole.MEMBER,
            },
          });
        }

        // Mark invite as accepted
        await tx.teamInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });
      }
    }

    return newUser;
  });

  return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
}
