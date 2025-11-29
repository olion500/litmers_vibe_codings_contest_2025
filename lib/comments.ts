import { prisma } from "./prisma";
import { canEditProject } from "./issues";
import { TeamRole } from "@prisma/client";

export async function requireIssueWithMembership(issueId: string, userId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null, project: { team: { members: { some: { userId, deletedAt: null } }, deletedAt: null } } },
    include: { project: { include: { team: { include: { members: true } } } } },
  });
  if (!issue) return null;
  const membership = issue.project.team.members.find((m) => m.userId === userId && m.deletedAt === null) || null;
  return { issue, membership };
}

export function canManageComment(membershipRole: TeamRole | null, authorId: string, userId: string) {
  if (userId === authorId) return true;
  if (!membershipRole) return false;
  return canEditProject(membershipRole);
}

export async function createComment(issueId: string, userId: string, content: string) {
  const access = await requireIssueWithMembership(issueId, userId);
  if (!access?.membership) throw new Error("Not found");
  return prisma.comment.create({ data: { issueId, authorId: userId, content } });
}

export async function updateComment(commentId: string, userId: string, content: string) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    include: { issue: { include: { project: { include: { team: { include: { members: true } } } } } } },
  });
  if (!comment) throw new Error("Not found");
  const membership = comment.issue.project.team.members.find((m) => m.userId === userId && m.deletedAt === null) || null;
  if (!canManageComment(membership?.role ?? null, comment.authorId, userId)) throw new Error("Forbidden");
  return prisma.comment.update({ where: { id: comment.id }, data: { content } });
}

export async function softDeleteComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    include: { issue: { include: { project: { include: { team: { include: { members: true } } } } } } },
  });
  if (!comment) throw new Error("Not found");
  const membership = comment.issue.project.team.members.find((m) => m.userId === userId && m.deletedAt === null) || null;
  if (!canManageComment(membership?.role ?? null, comment.authorId, userId)) throw new Error("Forbidden");
  return prisma.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
}
