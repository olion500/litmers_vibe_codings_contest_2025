"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  moveIssue,
  createSubtask as createSubtaskHelper,
  updateSubtask as updateSubtaskHelper,
} from "@/lib/issues";

export async function moveIssueAction(formData: FormData) {
  const session = await requireSession();
  const issueId = String(formData.get("issueId"));
  const statusId = String(formData.get("statusId"));
  const toOrder = Number(formData.get("toOrder") || 0);
  await moveIssue(issueId, session.user.id, statusId, toOrder);
  const projectId = String(formData.get("projectId") || "");
  revalidatePath(`/projects/${projectId || ""}`);
}

export async function updateWipAction(formData: FormData) {
  const session = await requireSession();
  const statusId = String(formData.get("statusId"));
  const wipLimit = Number(formData.get("wipLimit") || 0);
  const status = await prisma.status.findUnique({ where: { id: statusId }, include: { project: true } });
  if (!status) return;
  const membership = await prisma.teamMember.findFirst({ where: { teamId: status.project.teamId, userId: session.user.id, deletedAt: null } });
  if (!membership || membership.role === "MEMBER") return;
  await prisma.status.update({ where: { id: statusId }, data: { wipLimit } });
  revalidatePath(`/projects/${status.projectId}`);
}

export async function toggleSubtaskAction(formData: FormData) {
  const session = await requireSession();
  const subtaskId = String(formData.get("subtaskId"));
  const completed = formData.get("completed") === "true";
  const projectId = String(formData.get("projectId") || "");
  await updateSubtaskHelper(subtaskId, session.user.id, { completed });
  revalidatePath(`/projects/${projectId || ""}`);
}

export async function addSubtaskAction(formData: FormData) {
  const session = await requireSession();
  const issueId = String(formData.get("issueId"));
  const title = String(formData.get("title"));
  if (!title) return;
  await createSubtaskHelper(issueId, session.user.id, title);
  const projectId = String(formData.get("projectId") || "");
  revalidatePath(`/projects/${projectId || ""}`);
}
