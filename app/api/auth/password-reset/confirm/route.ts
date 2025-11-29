import { NextResponse } from "next/server";
import { authSchemas } from "@/lib/validation";
import { verifyPasswordResetToken, consumePasswordResetToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = authSchemas.resetPassword.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const record = await verifyPasswordResetToken(parsed.data.token);
  if (!record) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });

  await consumePasswordResetToken(record.id);

  return NextResponse.json({ success: true });
}
