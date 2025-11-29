import { prisma } from "./prisma";
import { IssuePriority, StatusKind, TeamRole } from "@prisma/client";
import { notFound } from "next/navigation";

const ISSUE_LIMIT = 200;
const LABEL_LIMIT = 20; // per project
const LABELS_PER_ISSUE_LIMIT = 5;
const SUBTASK_LIMIT = 20;
const CUSTOM_STATUS_LIMIT = 5;

function parseOptionalDate(value?: string | null) {
  if (!value || value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function requireProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null, team: { members: { some: { userId, deletedAt: null } }, deletedAt: null } },
    include: {
      team: { include: { members: { where: { userId, deletedAt: null } } } },
    },
  });
  if (!project) notFound();
  const membership = project.team.members[0];
  return { project, membership };
}

export function canEditProject(role: TeamRole) {
  return role === TeamRole.OWNER || role === TeamRole.ADMIN;
}

async function recordHistory(issueId: string, actorId: string, field: string, oldValue: string | null, newValue: string | null) {
  if (oldValue === newValue) return;
  await prisma.issueHistory.create({ data: { issueId, actorId, field, oldValue: oldValue ?? null, newValue: newValue ?? null } });
}

export async function createIssue(params: {
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: IssuePriority;
  labels?: string[];
  userId: string;
}) {
  const { project, membership } = await requireProjectAccess(params.projectId, params.userId);
  if (!canEditProject(membership.role)) throw new Error("Forbidden");

  const issueCount = await prisma.issue.count({ where: { projectId: project.id, deletedAt: null } });
  if (issueCount >= ISSUE_LIMIT) throw new Error("Issue limit reached");

  // default status = Backlog
  const backlog = await prisma.status.findFirst({ where: { projectId: project.id, kind: StatusKind.BACKLOG, deletedAt: null }, orderBy: { position: "asc" } });
  if (!backlog) throw new Error("Missing default status");

  const currentOrder = await prisma.issue.count({ where: { statusId: backlog.id, deletedAt: null } });

  const labelIds = params.labels ?? [];
  if (labelIds.length > LABELS_PER_ISSUE_LIMIT) throw new Error("Too many labels");

  if (labelIds.length) {
    const validCount = await prisma.projectLabel.count({ where: { id: { in: labelIds }, projectId: project.id } });
    if (validCount !== labelIds.length) throw new Error("Invalid labels for project");
  }

  if (params.assigneeId) {
    const assigneeMember = await prisma.teamMember.findFirst({ where: { teamId: project.teamId, userId: params.assigneeId, deletedAt: null } });
    if (!assigneeMember) throw new Error("Assignee must be a team member");
  }

  const dueDateValue = parseOptionalDate(params.dueDate);

  const issue = await prisma.issue.create({
    data: {
      projectId: project.id,
      statusId: backlog.id,
      title: params.title,
      description: params.description,
      priority: params.priority ?? IssuePriority.MEDIUM,
      dueDate: dueDateValue,
      assigneeId: params.assigneeId ?? null,
      ownerId: params.userId,
      statusOrder: currentOrder,
      labels: labelIds.length
        ? {
            createMany: {
              data: labelIds.map((labelId) => ({ labelId })),
            },
          }
        : undefined,
    },
  });

  return issue;
}

export async function updateIssue(issueId: string, userId: string, updates: {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: IssuePriority;
  statusId?: string;
  labels?: string[];
}) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null, project: { team: { members: { some: { userId, deletedAt: null } }, deletedAt: null } } },
    include: { project: { include: { team: { include: { members: true } } } }, status: true, labels: true },
  });
  if (!issue) notFound();

  const membership = issue.project.team.members.find((m) => m.userId === userId && m.deletedAt === null);
  if (!membership || !canEditProject(membership.role)) throw new Error("Forbidden");

  const labelIds = updates.labels;
  if (labelIds && labelIds.length > LABELS_PER_ISSUE_LIMIT) throw new Error("Too many labels");

  if (labelIds) {
    const validCount = await prisma.projectLabel.count({ where: { id: { in: labelIds }, projectId: issue.projectId } });
    if (validCount !== labelIds.length) throw new Error("Invalid labels for project");
  }

  if (updates.assigneeId) {
    const assigneeMember = await prisma.teamMember.findFirst({ where: { teamId: issue.project.teamId, userId: updates.assigneeId, deletedAt: null } });
    if (!assigneeMember) throw new Error("Assignee must be a team member");
  }

  return prisma.$transaction(async (tx) => {
    // status move with ordering and WIP
    if (updates.statusId && updates.statusId !== issue.statusId) {
      const destStatus = await tx.status.findFirst({ where: { id: updates.statusId, projectId: issue.projectId, deletedAt: null } });
      if (!destStatus) throw new Error("Invalid status");

      if (destStatus.wipLimit > 0) {
        const count = await tx.issue.count({ where: { statusId: destStatus.id, deletedAt: null } });
        if (count >= destStatus.wipLimit) throw new Error("WIP limit reached");
      }

      const order = await tx.issue.count({ where: { statusId: destStatus.id, deletedAt: null } });
      await tx.issue.update({ where: { id: issue.id }, data: { statusId: destStatus.id, statusOrder: order } });
      await recordHistory(issue.id, userId, "status", issue.statusId, destStatus.id);
    }

    const data: Record<string, unknown> = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.assigneeId !== undefined) data.assigneeId = updates.assigneeId;
    if (updates.dueDate !== undefined) data.dueDate = parseOptionalDate(updates.dueDate);
    if (updates.priority !== undefined) data.priority = updates.priority;

    if (Object.keys(data).length) {
      await tx.issue.update({ where: { id: issue.id }, data });
      if (updates.title !== undefined) await recordHistory(issue.id, userId, "title", issue.title, updates.title);
      if (updates.assigneeId !== undefined) await recordHistory(issue.id, userId, "assignee", issue.assigneeId ?? null, updates.assigneeId ?? null);
      if (updates.dueDate !== undefined) await recordHistory(issue.id, userId, "dueDate", issue.dueDate?.toISOString() ?? null, updates.dueDate ?? null);
      if (updates.priority !== undefined) await recordHistory(issue.id, userId, "priority", issue.priority, updates.priority);
      if (updates.description !== undefined) await recordHistory(issue.id, userId, "description", issue.description ?? null, updates.description ?? null);
    }

    if (labelIds) {
      await tx.issueLabel.deleteMany({ where: { issueId: issue.id } });
      if (labelIds.length) {
        await tx.issueLabel.createMany({ data: labelIds.map((labelId) => ({ issueId: issue.id, labelId })) });
      }
    }

    return tx.issue.findUnique({
      where: { id: issue.id },
      include: { labels: { include: { label: true } }, status: true, subtasks: true },
    });
  });
}

export async function softDeleteIssue(issueId: string, userId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null, project: { team: { members: { some: { userId, deletedAt: null } }, deletedAt: null } } },
    include: { project: { include: { team: { include: { members: true } } } } },
  });
  if (!issue) notFound();
  const membership = issue.project.team.members.find((m) => m.userId === userId && m.deletedAt === null);
  if (!membership || !canEditProject(membership.role)) throw new Error("Forbidden");
  await prisma.issue.update({ where: { id: issue.id }, data: { deletedAt: new Date() } });
}

export async function createLabel(projectId: string, userId: string, name: string, color: string) {
  const { project, membership } = await requireProjectAccess(projectId, userId);
  if (!canEditProject(membership.role)) throw new Error("Forbidden");

  const count = await prisma.projectLabel.count({ where: { projectId: project.id } });
  if (count >= LABEL_LIMIT) throw new Error("Label limit reached");

  const normalizedColor = color.startsWith("#") ? color : `#${color}`;
  return prisma.projectLabel.create({ data: { projectId: project.id, name, color: normalizedColor } });
}

export async function createStatus(projectId: string, userId: string, name: string, color: string, wipLimit = 0) {
  const { project, membership } = await requireProjectAccess(projectId, userId);
  if (!canEditProject(membership.role)) throw new Error("Forbidden");

  const customCount = await prisma.status.count({ where: { projectId: project.id, kind: StatusKind.CUSTOM, deletedAt: null } });
  if (customCount >= CUSTOM_STATUS_LIMIT) throw new Error("Status limit reached");

  const position = await prisma.status.count({ where: { projectId: project.id, deletedAt: null } });
  const normalizedColor = color.startsWith("#") ? color : `#${color}`;

  return prisma.status.create({ data: { projectId: project.id, name, color: normalizedColor, position, kind: StatusKind.CUSTOM, wipLimit } });
}

export async function reorderStatuses(projectId: string, userId: string, order: { statusId: string; position: number }[]) {
  const { project, membership } = await requireProjectAccess(projectId, userId);
  if (!canEditProject(membership.role)) throw new Error("Forbidden");
  await prisma.$transaction(
    order.map((item) =>
      prisma.status.update({
        where: { id: item.statusId, projectId: project.id },
        data: { position: item.position },
      })
    )
  );
}

export async function moveIssue(issueId: string, userId: string, toStatusId: string, toOrder: number) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null, project: { team: { members: { some: { userId, deletedAt: null } } } } },
    include: { status: true, project: true },
  });
  if (!issue) notFound();

  const membership = await prisma.teamMember.findFirst({ where: { teamId: issue.project.teamId, userId, deletedAt: null } });
  if (!membership || !canEditProject(membership.role)) throw new Error("Forbidden");

  const destStatus = await prisma.status.findFirst({ where: { id: toStatusId, projectId: issue.projectId, deletedAt: null } });
  if (!destStatus) throw new Error("Invalid status");

  if (destStatus.wipLimit > 0) {
    const count = await prisma.issue.count({ where: { statusId: destStatus.id, deletedAt: null } });
    if (count >= destStatus.wipLimit) throw new Error("WIP limit reached");
  }

  return prisma.$transaction(async (tx) => {
    const destIssues = await tx.issue.findMany({
      where: { statusId: destStatus.id, deletedAt: null },
      orderBy: { statusOrder: "asc" },
      select: { id: true },
    });

    const originIssues = destStatus.id === issue.statusId ? destIssues : await tx.issue.findMany({
      where: { statusId: issue.statusId, deletedAt: null },
      orderBy: { statusOrder: "asc" },
      select: { id: true },
    });

    // Build new order lists
    const destList = destIssues.map((i) => i.id);
    if (destStatus.id === issue.statusId) {
      // moving within same column
      const list = originIssues.map((i) => i.id).filter((id) => id !== issue.id);
      const insertAt = Math.min(Math.max(toOrder, 0), list.length);
      list.splice(insertAt, 0, issue.id);
      for (let idx = 0; idx < list.length; idx++) {
        await tx.issue.update({ where: { id: list[idx] }, data: { statusOrder: idx } });
      }
    } else {
      // remove from origin
      const originList = originIssues.map((i) => i.id).filter((id) => id !== issue.id);
      for (let idx = 0; idx < originList.length; idx++) {
        await tx.issue.update({ where: { id: originList[idx] }, data: { statusOrder: idx } });
      }

      const insertAt = Math.min(Math.max(toOrder, 0), destList.length);
      destList.splice(insertAt, 0, issue.id);
      for (let idx = 0; idx < destList.length; idx++) {
        await tx.issue.update({ where: { id: destList[idx] }, data: { statusId: destStatus.id, statusOrder: idx } });
      }
    }

    if (destStatus.id !== issue.statusId) {
      await recordHistory(issue.id, userId, "status", issue.statusId, destStatus.id);
    }
  });
}

export async function createSubtask(issueId: string, userId: string, title: string) {
  const issue = await prisma.issue.findFirst({ where: { id: issueId, deletedAt: null, project: { team: { members: { some: { userId, deletedAt: null } } } } }, include: { subtasks: true } });
  if (!issue) notFound();
  if (issue.subtasks.length >= SUBTASK_LIMIT) throw new Error("Subtask limit reached");

  const position = issue.subtasks.length;
  return prisma.subtask.create({ data: { issueId: issue.id, title, position } });
}

export async function updateSubtask(subtaskId: string, userId: string, data: { title?: string; completed?: boolean }) {
  const subtask = await prisma.subtask.findFirst({ where: { id: subtaskId }, include: { issue: { include: { project: { include: { team: true } } } } } });
  if (!subtask) notFound();
  const membership = await prisma.teamMember.findFirst({ where: { teamId: subtask.issue.project.teamId, userId, deletedAt: null } });
  if (!membership || !canEditProject(membership.role)) throw new Error("Forbidden");
  return prisma.subtask.update({ where: { id: subtaskId }, data });
}

export async function reorderSubtasks(issueId: string, userId: string, orderedIds: string[]) {
  const issue = await prisma.issue.findFirst({ where: { id: issueId, deletedAt: null, project: { team: { members: { some: { userId, deletedAt: null } } } } } });
  if (!issue) notFound();
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.subtask.update({
        where: { id },
        data: { position: idx },
      })
    )
  );
}
