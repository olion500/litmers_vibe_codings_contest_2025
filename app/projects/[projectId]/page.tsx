import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { issueSchemas } from "@/lib/validation";
import type { IssuePriority } from "@prisma/client";
import {
  createIssue,
  moveIssue,
  createSubtask as createSubtaskHelper,
  createLabel as createLabelHelper,
  updateSubtask as updateSubtaskHelper,
  createStatus as createStatusHelper,
} from "@/lib/issues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AppShell } from "@/components/sidebar";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const session = await requireSession();
  const sp = typeof searchParams === "function" || searchParams instanceof Promise ? await searchParams : searchParams;
  const statusFilter = typeof sp?.status === "string" ? sp.status.split(",") : [];
  const assigneeFilter = typeof sp?.assignee === "string" ? sp.assignee : undefined;
  const priorityOptions = ["HIGH", "MEDIUM", "LOW"] as const;
  const isPriority = (p: unknown): p is IssuePriority => typeof p === "string" && priorityOptions.includes(p as IssuePriority);
  const priorityFilter = isPriority(sp?.priority) ? (sp?.priority as IssuePriority) : undefined;
  const sort = typeof sp?.sort === "string" ? sp.sort : "createdAt";
  const search = typeof sp?.q === "string" ? sp.q : undefined;

  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      deletedAt: null,
      team: { members: { some: { userId: session.user.id, deletedAt: null } }, deletedAt: null },
    },
    include: {
      team: { include: { members: { where: { deletedAt: null }, include: { user: true } } } },
      statuses: { where: { deletedAt: null }, orderBy: { position: "asc" } },
      issues: {
        where: {
          deletedAt: null,
          ...(statusFilter.length ? { statusId: { in: statusFilter } } : {}),
          ...(assigneeFilter ? { assigneeId: assigneeFilter } : {}),
          ...(priorityFilter ? { priority: priorityFilter } : {}),
          ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
        },
        orderBy: [sort === "priority" ? { priority: "asc" } : { [sort]: "asc" }, { statusOrder: "asc" }],
        include: {
          status: true,
          labels: { include: { label: true } },
          subtasks: { orderBy: { position: "asc" } },
          assignee: true,
          owner: true,
        },
      },
    },
  });

  if (!project) notFound();

  const labels = await prisma.projectLabel.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } });

  async function addStatus(formData: FormData) {
    "use server";
    const session = await requireSession();
    const name = String(formData.get("name") || "").trim();
    const color = String(formData.get("color") || "#64748B");
    const wip = Number(formData.get("wipLimit") || "0");
    if (!name) redirect(`/projects/${params.projectId}?error=status`);
    try {
      await createStatusHelper(params.projectId, session.user.id, name, color, wip);
    } catch (err) {
      const message = err instanceof Error ? err.message : "status-limit";
      redirect(`/projects/${params.projectId}?error=${encodeURIComponent(message)}`);
    }
    revalidatePath(`/projects/${params.projectId}`);
  }

  async function updateWip(formData: FormData) {
    "use server";
    const session = await requireSession();
    const statusId = String(formData.get("statusId"));
    const wipLimit = Number(formData.get("wipLimit"));
    const status = await prisma.status.findFirst({ where: { id: statusId, projectId: params.projectId } });
    if (!status) redirect(`/projects/${params.projectId}?error=status`);
    const membership = await prisma.teamMember.findFirst({ where: { teamId: project.teamId, userId: session.user.id, deletedAt: null } });
    if (!membership || membership.role === "MEMBER") redirect(`/projects/${params.projectId}?error=forbidden`);
    await prisma.status.update({ where: { id: statusId, projectId: params.projectId }, data: { wipLimit } });
    revalidatePath(`/projects/${params.projectId}`);
  }

  async function addIssue(formData: FormData) {
    "use server";
    const session = await requireSession();
    const parsed = issueSchemas.create.safeParse({
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      assigneeId: formData.get("assigneeId") || undefined,
      dueDate: formData.get("dueDate") || undefined,
      priority: formData.get("priority") || "MEDIUM",
      labels: formData.getAll("labels")?.map(String) ?? [],
    });
    if (!parsed.success) redirect(`/projects/${params.projectId}?error=invalid`);
    try {
      await createIssue({ ...parsed.data, userId: session.user.id });
    } catch (err) {
      redirect(`/projects/${params.projectId}?error=${encodeURIComponent((err as Error).message)}`);
    }
    revalidatePath(`/projects/${params.projectId}`);
  }

  async function addLabel(formData: FormData) {
    "use server";
    const session = await requireSession();
    const name = String(formData.get("name") || "").trim();
    const color = String(formData.get("color") || "");
    if (!name) redirect(`/projects/${params.projectId}?error=label`);
    try {
      await createLabelHelper(params.projectId, session.user.id, name, color);
    } catch (err) {
      const message = err instanceof Error ? err.message : "label-limit";
      redirect(`/projects/${params.projectId}?error=${encodeURIComponent(message)}`);
    }
    revalidatePath(`/projects/${params.projectId}`);
  }

  async function move(formData: FormData) {
    "use server";
    const session = await requireSession();
    const issueId = String(formData.get("issueId"));
    const toStatusId = String(formData.get("statusId"));
    const toOrderRaw = formData.get("toOrder");
    const toOrder = toOrderRaw ? Number(toOrderRaw) : 0;
    await moveIssue(issueId, session.user.id, toStatusId, toOrder);
    revalidatePath(`/projects/${params.projectId}`);
  }

  async function addSubtask(formData: FormData) {
    "use server";
    const session = await requireSession();
    const issueId = String(formData.get("issueId"));
    const title = String(formData.get("title"));
    if (!title) redirect(`/projects/${params.projectId}?error=subtask`);
    await createSubtaskHelper(issueId, session.user.id, title);
    revalidatePath(`/projects/${params.projectId}`);
  }

  async function toggleSubtask(formData: FormData) {
    "use server";
    const session = await requireSession();
    const subtaskId = String(formData.get("subtaskId"));
    const completed = formData.get("completed") === "true";
    await updateSubtaskHelper(subtaskId, session.user.id, { completed });
    revalidatePath(`/projects/${params.projectId}`);
  }

  const issuesByStatus = project.statuses.map((status) => ({
    status,
    issues: project.issues.filter((i) => i.statusId === status.id),
  }));

  return (
    <AppShell>
      <main className="max-w-6xl mx-auto py-6 space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Team: {project.team.name}</p>
        <h1 className="text-3xl font-semibold">{project.name}</h1>
        {project.archivedAt && <Badge variant="secondary">Archived</Badge>}
      </header>

      {project.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-foreground/80">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Create Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addIssue} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input name="title" id="title" required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigneeId">Assignee</Label>
              <select
                name="assigneeId"
                id="assigneeId"
                defaultValue=""
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Unassigned</option>
                {project.team.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name || m.user?.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                name="priority"
                id="priority"
                defaultValue="MEDIUM"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input type="date" name="dueDate" id="dueDate" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="labels">Labels</Label>
              <select
                id="labels"
                multiple
                name="labels"
                className="mt-1 h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Hold Cmd/Ctrl to select up to 5 labels.</p>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea name="description" id="description" maxLength={5000} rows={4} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Create Issue</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle>Labels</CardTitle>
          <form action={addLabel} className="flex gap-2 items-center">
            <Input name="name" placeholder="Label name" maxLength={40} className="w-36" />
            <Input name="color" placeholder="#2563EB" className="w-28" />
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {labels.map((l) => (
              <span key={l.id} className="px-3 py-1 rounded-full text-sm" style={{ background: l.color, color: "white" }}>
                {l.name}
              </span>
            ))}
            {labels.length === 0 && <p className="text-sm text-muted-foreground">No labels yet.</p>}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Board</h2>
          <form className="flex flex-wrap items-center gap-2 text-sm" method="get">
            <input type="hidden" name="projectId" value={project.id} />
            <Input name="q" placeholder="Search title" defaultValue={search} className="w-40" />
            <select name="status" defaultValue={statusFilter.join(",")} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
              <option value="">All statuses</option>
              {project.statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select name="assignee" defaultValue={assigneeFilter} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
              <option value="">Any assignee</option>
              {project.team.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name || m.user?.email}
                </option>
              ))}
            </select>
            <select name="priority" defaultValue={priorityFilter} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
              <option value="">Any priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select name="sort" defaultValue={sort} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
              <option value="createdAt">Created</option>
              <option value="updatedAt">Updated</option>
              <option value="dueDate">Due</option>
              <option value="priority">Priority</option>
            </select>
            <Button size="sm" type="submit">
              Filter
            </Button>
          </form>
        </div>
        <details className="rounded border p-3 bg-muted/40 text-sm">
          <summary className="cursor-pointer font-semibold">Add custom status</summary>
          <form action={addStatus} className="mt-3 flex flex-wrap gap-2 items-center">
            <Input name="name" placeholder="Name" maxLength={40} className="w-32" required />
            <Input name="color" placeholder="#2563EB" className="w-28" />
            <Input name="wipLimit" type="number" min={0} max={50} placeholder="WIP (0=∞)" className="w-28" />
            <Button size="sm" type="submit">Add</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-1">Up to 5 custom statuses. WIP 1-50 or 0 for unlimited.</p>
        </details>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {issuesByStatus.map(({ status, issues }) => (
            <Card key={status.id} className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold" style={{ color: status.color }}>
                    {status.name}
                  </p>
                  <form action={updateWip} className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <input type="hidden" name="statusId" value={status.id} />
                    <span>WIP</span>
                    <Input type="number" name="wipLimit" min={0} max={50} defaultValue={status.wipLimit} className="w-16 px-2 py-1" />
                    <span className="text-[11px]">(0 = ∞)</span>
                    <Button type="submit" size="sm" variant="outline" className="h-7 px-2">Save</Button>
                  </form>
                  {status.wipLimit > 0 && (
                    <p className="text-xs text-muted-foreground">Current {issues.length}/{status.wipLimit}</p>
                  )}
                </div>
              </div>
              {issues.map((issue, idx) => (
                <article key={issue.id} className="rounded-md border p-3 space-y-2 bg-card">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <a className="font-semibold hover:underline" href={`/projects/${project.id}/issues/${issue.id}`}>
                        {issue.title}
                      </a>
                      <p className="text-xs text-muted-foreground">#{issue.id.slice(0, 6)}</p>
                    </div>
                    <Badge variant="secondary">{issue.priority}</Badge>
                  </div>
                  {issue.description && <p className="text-sm text-foreground/80 line-clamp-3">{issue.description}</p>}
                  <div className="flex flex-wrap gap-1 text-xs">
                    {issue.labels.map((l) => (
                      <span key={l.id} className="px-2 py-0.5 rounded" style={{ background: l.label.color, color: "white" }}>
                        {l.label.name}
                      </span>
                    ))}
                    {issue.assignee && <Badge variant="outline">{issue.assignee.name || issue.assignee.email}</Badge>}
                  </div>

                  <form action={move} className="flex items-center gap-2 text-sm">
                    <input type="hidden" name="issueId" value={issue.id} />
                    <input type="hidden" name="toOrder" value={idx} />
                    <Label className="text-xs text-muted-foreground">Move</Label>
                    <select name="statusId" className="rounded-md border border-input bg-background px-2 py-1 text-sm" defaultValue={issue.statusId}>
                      {project.statuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" className="h-8 px-3">
                      Go
                    </Button>
                  </form>
                  <div className="flex gap-1 text-[11px] text-muted-foreground">
                    {idx > 0 && (
                      <form action={move}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <input type="hidden" name="statusId" value={status.id} />
                        <input type="hidden" name="toOrder" value={idx - 1} />
                        <Button variant="link" size="sm" className="h-auto px-1">↑</Button>
                      </form>
                    )}
                    {idx < issues.length - 1 && (
                      <form action={move}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <input type="hidden" name="statusId" value={status.id} />
                        <input type="hidden" name="toOrder" value={idx + 1} />
                        <Button variant="link" size="sm" className="h-auto px-1">↓</Button>
                      </form>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold">
                      Subtasks {issue.subtasks.filter((s) => s.completed).length}/{issue.subtasks.length}
                    </p>
                    {issue.subtasks.map((st) => (
                      <form key={st.id} action={toggleSubtask} className="flex items-center gap-2 text-xs">
                        <input type="hidden" name="subtaskId" value={st.id} />
                        <input type="hidden" name="completed" value={st.completed ? "false" : "true"} />
                        <Checkbox checked={st.completed} readOnly className="h-3.5 w-3.5" />
                        <span className={st.completed ? "line-through" : ""}>{st.title}</span>
                        <Button type="submit" variant="link" size="sm" className="h-auto px-1 text-[11px]">
                          Toggle
                        </Button>
                      </form>
                    ))}
                    <form action={addSubtask} className="flex items-center gap-2 text-xs">
                      <input type="hidden" name="issueId" value={issue.id} />
                      <Input name="title" placeholder="New subtask" className="flex-1" />
                      <Button type="submit" size="sm" className="h-8">Add</Button>
                    </form>
                  </div>
                </article>
              ))}

              {issues.length === 0 && <p className="text-xs text-muted-foreground">No issues</p>}
            </Card>
          ))}
        </div>
      </section>
      </main>
    </AppShell>
  );
}
