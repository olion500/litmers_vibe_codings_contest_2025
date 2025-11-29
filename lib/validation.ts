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

export type RegisterInput = z.infer<typeof authSchemas.register>;
export type LoginInput = z.infer<typeof authSchemas.login>;
export type ResetRequestInput = z.infer<typeof authSchemas.requestReset>;
export type ResetPasswordInput = z.infer<typeof authSchemas.resetPassword>;
