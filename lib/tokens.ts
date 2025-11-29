import crypto from "node:crypto";
import { prisma } from "./prisma";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashed = hashToken(rawToken);

  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  // Replace existing tokens for the user to keep it simple.
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: {
      token: hashed,
      userId,
      expires,
    },
  });

  return { rawToken, expires };
}

export async function verifyPasswordResetToken(rawToken: string) {
  const hashed = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findFirst({
    where: { token: hashed },
  });

  if (!record) return null;
  if (record.expires.getTime() < Date.now()) return null;
  return record;
}

export async function consumePasswordResetToken(tokenId: string) {
  await prisma.passwordResetToken.delete({ where: { id: tokenId } });
}
