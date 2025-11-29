import { z } from "zod";

export const authSchemas = {
  register: z.object({
    name: z.string().min(1).max(50),
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
  login: z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
  requestReset: z.object({
    email: z.string().email(),
  }),
  resetPassword: z.object({
    token: z.string().min(10),
    password: z.string().min(6).max(100),
  }),
};

export const profileSchemas = {
  updateProfile: z.object({
    name: z.string().min(1).max(50),
    image: z.string().url().or(z.literal("")).nullable().optional(),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(6).max(100),
    newPassword: z.string().min(6).max(100),
  }),
  deleteAccount: z.discriminatedUnion("method", [
    z.object({ method: z.literal("password"), password: z.string().min(6).max(100) }),
    z.object({ method: z.literal("oauth"), confirm: z.literal(true) }),
  ]),
};

export type UpdateProfileInput = z.infer<typeof profileSchemas.updateProfile>;
export type ChangePasswordInput = z.infer<typeof profileSchemas.changePassword>;
export type DeleteAccountInput = z.infer<typeof profileSchemas.deleteAccount>;

export const teamSchemas = {
  create: z.object({ name: z.string().min(1).max(50) }),
  rename: z.object({ name: z.string().min(1).max(50) }),
  invite: z.object({ email: z.string().email() }),
  changeRole: z.object({ role: z.enum(["OWNER", "ADMIN", "MEMBER"]) }),
};

export const projectSchemas = {
  create: z.object({ teamId: z.string(), name: z.string().min(1).max(100), description: z.string().max(2000).optional() }),
  update: z.object({ name: z.string().min(1).max(100), description: z.string().max(2000).optional() }),
};

const hexColor = z.string().regex(/^#?[0-9A-Fa-f]{6}$/);

export const issueSchemas = {
  create: z.object({
    projectId: z.string(),
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    assigneeId: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
    labels: z.array(z.string()).max(5).optional().default([]),
  }),
  update: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    assigneeId: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    statusId: z.string().optional(),
    labels: z.array(z.string()).max(5).optional(),
  }),
  createLabel: z.object({ projectId: z.string(), name: z.string().min(1).max(40), color: hexColor }),
  createStatus: z.object({
    projectId: z.string(),
    name: z.string().min(1).max(40),
    color: hexColor,
    wipLimit: z.number().int().nonnegative().max(50).default(0),
  }),
  reorderStatuses: z.object({
    projectId: z.string(),
    order: z.array(z.object({ statusId: z.string(), position: z.number().int().nonnegative() })),
  }),
  moveIssue: z.object({
    issueId: z.string(),
    toStatusId: z.string(),
    toOrder: z.number().int().nonnegative(),
  }),
  subtask: z.object({ issueId: z.string(), title: z.string().min(1).max(200) }),
  updateSubtask: z.object({ subtaskId: z.string(), title: z.string().min(1).max(200).optional(), completed: z.boolean().optional() }),
  issueQuery: z.object({
    projectId: z.string(),
    search: z.string().max(200).optional(),
    statusIds: z.array(z.string()).optional(),
    assigneeId: z.string().optional(),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    labelIds: z.array(z.string()).optional(),
    dueFrom: z.string().optional(),
    dueTo: z.string().optional(),
    hasDue: z.boolean().optional(),
    sort: z.enum(["createdAt", "dueDate", "priority", "updatedAt"]).optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(100).optional(),
  }),
};

export const statusSchemas = {
  updateWip: z.object({ wipLimit: z.number().int().nonnegative().max(50).default(0) }),
};

export type IssueCreateInput = z.infer<typeof issueSchemas.create>;
export type IssueUpdateInput = z.infer<typeof issueSchemas.update>;
export type IssueQueryInput = z.infer<typeof issueSchemas.issueQuery>;

export type RegisterInput = z.infer<typeof authSchemas.register>;
export type LoginInput = z.infer<typeof authSchemas.login>;
export type ResetRequestInput = z.infer<typeof authSchemas.requestReset>;
export type ResetPasswordInput = z.infer<typeof authSchemas.resetPassword>;
