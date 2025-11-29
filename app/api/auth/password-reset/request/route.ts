import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authSchemas } from "@/lib/validation";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = authSchemas.requestReset.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, deletedAt: null } });

  if (!user) {
    // Avoid leaking existence.
    return NextResponse.json({ success: true });
  }

  const { rawToken } = await createPasswordResetToken(user.id);
  await sendPasswordResetEmail(user.email, rawToken);

  return NextResponse.json({ success: true });
}
