import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { commentSchemas } from "@/lib/validation";
import { softDeleteComment, updateComment } from "@/lib/comments";

export default async function IssueDetailPage({ params, searchParams }: { params: { projectId: string; issueId: string }; searchParams?: { [key: string]: string | string[] | undefined } }) {
  const session = await requireSession();
  const page = Number(searchParams?.page) || 1;
  const pageSize = 10;

  const issue = await prisma.issue.findFirst({
    where: {
      id: params.issueId,
      projectId: params.projectId,
      deletedAt: null,
      project: { team: { members: { some: { userId: session.user.id, deletedAt: null } }, deletedAt: null } },
    },
    include: {
      project: { include: { team: true } },
      status: true,
      labels: { include: { label: true } },
      subtasks: { orderBy: { position: "asc" } },
      assignee: true,
      owner: true,
      histories: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: true } },
    },
  });

  if (!issue) notFound();

  const commentsTotal = await prisma.comment.count({ where: { issueId: issue.id, deletedAt: null } });
  const comments = await prisma.comment.findMany({
    where: { issueId: issue.id, deletedAt: null },
    include: { author: true },
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  async function addComment(formData: FormData) {
    "use server";
    const session = await requireSession();
    const content = String(formData.get("content") || "").trim();
    const parsed = commentSchemas.create.safeParse({ issueId: params.issueId, content });
    if (!parsed.success) redirect(`/projects/${params.projectId}/issues/${params.issueId}?error=comment`);
    await prisma.comment.create({ data: { issueId: params.issueId, authorId: session.user.id, content: parsed.data.content } });
    revalidatePath(`/projects/${params.projectId}/issues/${params.issueId}`);
  }

  async function editComment(formData: FormData) {
    "use server";
    const session = await requireSession();
    const commentId = String(formData.get("commentId"));
    const content = String(formData.get("content") || "").trim();
    const parsed = commentSchemas.update.safeParse({ content });
    if (!parsed.success) redirect(`/projects/${params.projectId}/issues/${params.issueId}?error=comment`);
    await updateComment(commentId, session.user.id, parsed.data.content);
    revalidatePath(`/projects/${params.projectId}/issues/${params.issueId}`);
  }

  async function removeComment(formData: FormData) {
    "use server";
    const session = await requireSession();
    const commentId = String(formData.get("commentId"));
    await softDeleteComment(commentId, session.user.id);
    revalidatePath(`/projects/${params.projectId}/issues/${params.issueId}`);
  }

  return (
    <main className="max-w-4xl mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Project {issue.project.name}</p>
          <h1 className="text-3xl font-semibold">{issue.title}</h1>
          <p className="text-sm text-gray-600">Status: {issue.status.name}</p>
        </div>
        <span className="text-xs px-3 py-1 rounded bg-gray-900 text-white">{issue.priority}</span>
      </div>

      {issue.description && (
        <section className="rounded border p-4 bg-white shadow-sm space-y-2">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="whitespace-pre-line text-gray-800">{issue.description}</p>
        </section>
      )}

      <section className="rounded border p-4 bg-white shadow-sm space-y-2">
        <h2 className="text-lg font-semibold">Details</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <p>Assignee: {issue.assignee?.name || issue.assignee?.email || "Unassigned"}</p>
          <p>Owner: {issue.owner?.name || issue.owner?.email}</p>
          <p>Due: {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : "No due date"}</p>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs font-semibold">Labels:</span>
            {issue.labels.map((l) => (
              <span key={l.id} className="px-2 py-1 rounded text-xs" style={{ background: l.label.color, color: "white" }}>
                {l.label.name}
              </span>
            ))}
            {issue.labels.length === 0 && <span className="text-xs text-gray-500">None</span>}
          </div>
        </div>
      </section>

      <section className="rounded border p-4 bg-white shadow-sm space-y-2">
        <h2 className="text-lg font-semibold">Subtasks</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          {issue.subtasks.map((st) => (
            <li key={st.id} className="flex items-center gap-2">
              <input type="checkbox" checked={st.completed} readOnly />
              <span className={st.completed ? "line-through" : ""}>{st.title}</span>
            </li>
          ))}
          {issue.subtasks.length === 0 && <li className="text-xs text-gray-500">No subtasks</li>}
        </ul>
      </section>

      <section className="rounded border p-4 bg-white shadow-sm space-y-2">
        <h2 className="text-lg font-semibold">Change History</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          {issue.histories.map((h) => (
            <li key={h.id} className="border-b pb-2">
              <div className="flex justify-between">
                <span className="font-medium">{h.field}</span>
                <span className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-600">By {h.actor?.name || h.actor?.email}</p>
              <p className="text-xs">{h.oldValue ?? "(none)"} → {h.newValue ?? "(none)"}</p>
            </li>
          ))}
          {issue.histories.length === 0 && <li className="text-xs text-gray-500">No changes yet.</li>}
        </ul>
      </section>

      <section className="rounded border p-4 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comments</h2>
          <p className="text-xs text-gray-500">{commentsTotal} total</p>
        </div>
        <form action={addComment} className="space-y-2">
          <textarea name="content" rows={3} maxLength={2000} required className="w-full rounded border px-3 py-2" placeholder="Add a comment" />
          <div className="flex justify-end">
            <button type="submit" className="rounded bg-gray-900 text-white px-3 py-1">Post</button>
          </div>
        </form>
        <div className="space-y-3">
          {comments.map((c) => {
            const canManage = c.authorId === session.user.id || issue.project.team.ownerId === session.user.id || issue.project.team.members.some((m) => m.userId === session.user.id && (m.role === "OWNER" || m.role === "ADMIN"));
            return (
              <article key={c.id} className="border rounded p-3 space-y-1 bg-gray-50">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{c.author?.name || c.author?.email || "User"}</span>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-line">{c.content}</p>
                {canManage && (
                  <div className="flex gap-2 text-[11px] text-blue-600">
                    <form action={removeComment}>
                      <input type="hidden" name="commentId" value={c.id} />
                      <button className="underline">Delete</button>
                    </form>
                    <form action={editComment} className="flex gap-1 items-center">
                      <input type="hidden" name="commentId" value={c.id} />
                      <input name="content" defaultValue={c.content} className="rounded border px-2 py-1 text-xs" maxLength={2000} />
                      <button className="underline">Save</button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
          {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
        </div>
        {commentsTotal > pageSize && (
          <div className="flex justify-between text-xs text-blue-600">
            {page > 1 ? (
              <a href={`?page=${page - 1}`} className="underline">Previous</a>
            ) : <span />}
            {(page * pageSize) < commentsTotal ? (
              <a href={`?page=${page + 1}`} className="underline">Next</a>
            ) : <span />}
          </div>
        )}
      </section>
    </main>
  );
}
