import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { issueSchemas } from "@/lib/validation";
import { moveIssue } from "@/lib/issues";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Move failed");

export async function POST(req: Request, context: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await context.params;
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = issueSchemas.moveIssue.safeParse({ ...body, issueId: issueId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    await moveIssue(issueId, session.user.id, parsed.data.toStatusId, parsed.data.toOrder);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}
