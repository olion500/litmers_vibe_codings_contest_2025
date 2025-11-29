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

export type RegisterInput = z.infer<typeof authSchemas.register>;
export type LoginInput = z.infer<typeof authSchemas.login>;
export type ResetRequestInput = z.infer<typeof authSchemas.requestReset>;
export type ResetPasswordInput = z.infer<typeof authSchemas.resetPassword>;
