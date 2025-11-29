import { prisma } from "./prisma";

export async function logTeamActivity(teamId: string, actorId: string, type: string, message: string) {
  await prisma.teamActivity.create({
    data: { teamId, actorId, type, message },
  });
}
