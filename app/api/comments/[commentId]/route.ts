import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { commentSchemas } from "@/lib/validation";
import { softDeleteComment, updateComment } from "@/lib/comments";

const errorMessage = (err: unknown, fallback = "Unable to update comment") => (err instanceof Error ? err.message : fallback);

export async function PATCH(req: Request, { params }: { params: { commentId: string } }) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = commentSchemas.update.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const comment = await updateComment(params.commentId, session.user.id, parsed.data.content);
    return NextResponse.json({ comment });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { commentId: string } }) {
  const session = await requireSession();
  try {
    await softDeleteComment(params.commentId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, "Unable to delete comment") }, { status: 400 });
  }
}
