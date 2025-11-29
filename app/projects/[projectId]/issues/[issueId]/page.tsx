import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { commentSchemas } from "@/lib/validation";
import { softDeleteComment, updateComment } from "@/lib/comments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AppShell } from "@/components/sidebar";

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
    <AppShell>
      <main className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Project {issue.project.name}</p>
          <h1 className="text-3xl font-semibold">{issue.title}</h1>
          <p className="text-sm text-muted-foreground">Status: {issue.status.name}</p>
        </div>
        <Badge>{issue.priority}</Badge>
      </div>

      {issue.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-foreground/80">{issue.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground/80 space-y-1">
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
            {issue.labels.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Subtasks</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-foreground/80">
            {issue.subtasks.map((st) => (
              <li key={st.id} className="flex items-center gap-2">
                <Checkbox checked={st.completed} readOnly className="h-4 w-4" />
                <span className={st.completed ? "line-through" : ""}>{st.title}</span>
              </li>
            ))}
            {issue.subtasks.length === 0 && <li className="text-xs text-muted-foreground">No subtasks</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-foreground/80">
            {issue.histories.map((h) => (
              <li key={h.id} className="border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{h.field}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">By {h.actor?.name || h.actor?.email}</p>
                <p className="text-xs">{h.oldValue ?? "(none)"} → {h.newValue ?? "(none)"}</p>
              </li>
            ))}
            {issue.histories.length === 0 && <li className="text-xs text-muted-foreground">No changes yet.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Comments</CardTitle>
          <p className="text-xs text-muted-foreground">{commentsTotal} total</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={addComment} className="space-y-2">
            <Textarea name="content" rows={3} maxLength={2000} required placeholder="Add a comment" />
            <div className="flex justify-end">
              <Button type="submit" size="sm">Post</Button>
            </div>
          </form>
          <div className="space-y-3">
            {comments.map((c) => {
              const canManage = c.authorId === session.user.id || issue.project.team.ownerId === session.user.id || issue.project.team.members.some((m) => m.userId === session.user.id && (m.role === "OWNER" || m.role === "ADMIN"));
              return (
                <article key={c.id} className="border rounded p-3 space-y-1 bg-muted/40">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{c.author?.name || c.author?.email || "User"}</span>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line">{c.content}</p>
                  {canManage && (
                    <div className="flex gap-2 text-[11px] text-primary">
                      <form action={removeComment}>
                        <input type="hidden" name="commentId" value={c.id} />
                        <Button variant="link" size="sm" className="h-auto px-1">Delete</Button>
                      </form>
                      <form action={editComment} className="flex gap-1 items-center">
                        <input type="hidden" name="commentId" value={c.id} />
                        <Input name="content" defaultValue={c.content} className="h-8 text-xs" maxLength={2000} />
                        <Button variant="link" size="sm" className="h-auto px-1">Save</Button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
            {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          </div>
          {commentsTotal > pageSize && (
            <div className="flex justify-between text-xs text-primary">
              {page > 1 ? (
                <a href={`?page=${page - 1}`} className="underline">Previous</a>
              ) : <span />}
              {(page * pageSize) < commentsTotal ? (
                <a href={`?page=${page + 1}`} className="underline">Next</a>
              ) : <span />}
            </div>
          )}
        </CardContent>
      </Card>
      </main>
    </AppShell>
  );
}
