import { prisma } from "./prisma";
import { TeamRole } from "@prisma/client";
import { notFound } from "next/navigation";

export async function getTeamWithMembership(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId, deletedAt: null },
    include: {
      members: {
        where: { userId, deletedAt: null },
      },
    },
  });
  if (!team || team.members.length === 0) {
    return null;
  }
  return { team, membership: team.members[0] };
}

export async function requireTeamMembership(teamId: string, userId: string) {
  const result = await getTeamWithMembership(teamId, userId);
  if (!result) notFound();
  return result;
}

export function canManageTeam(role: TeamRole) {
  return role === TeamRole.OWNER || role === TeamRole.ADMIN;
}

export function ensureOwner(role: TeamRole) {
  return role === TeamRole.OWNER;
}
