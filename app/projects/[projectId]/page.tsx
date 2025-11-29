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

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await requireSession();
  const statusFilter = typeof searchParams?.status === "string" ? searchParams?.status.split(",") : [];
  const assigneeFilter = typeof searchParams?.assignee === "string" ? searchParams.assignee : undefined;
  const priorityOptions = ["HIGH", "MEDIUM", "LOW"] as const;
  const isPriority = (p: unknown): p is IssuePriority => typeof p === "string" && priorityOptions.includes(p as IssuePriority);
  const priorityFilter = isPriority(searchParams?.priority) ? (searchParams?.priority as IssuePriority) : undefined;
  const sort = typeof searchParams?.sort === "string" ? searchParams.sort : "createdAt";
  const search = typeof searchParams?.q === "string" ? searchParams.q : undefined;

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
    <main className="max-w-6xl mx-auto py-10 space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-gray-600">Team: {project.team.name}</p>
        <h1 className="text-3xl font-semibold">{project.name}</h1>
        {project.archivedAt && <p className="text-xs text-orange-600">Archived</p>}
      </header>

      {project.description && (
        <section className="rounded border p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="whitespace-pre-line text-gray-800">{project.description}</p>
        </section>
      )}

      <section className="rounded border p-5 bg-white shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Create Issue</h2>
        <form action={addIssue} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" name="projectId" value={project.id} />
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input name="title" required maxLength={200} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Assignee</label>
            <select name="assigneeId" className="mt-1 w-full rounded border px-3 py-2" defaultValue="">
              <option value="">Unassigned</option>
              {project.team.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name || m.user?.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Priority</label>
            <select name="priority" defaultValue="MEDIUM" className="mt-1 w-full rounded border px-3 py-2">
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Due Date</label>
            <input type="date" name="dueDate" className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Labels</label>
            <select multiple name="labels" className="mt-1 w-full rounded border px-3 py-2 h-24">
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Hold Cmd/Ctrl to select up to 5 labels.</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Description</label>
            <textarea name="description" maxLength={5000} rows={4} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded bg-black text-white px-4 py-2" type="submit">
              Create Issue
            </button>
          </div>
        </form>
      </section>

      <section className="rounded border p-5 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Labels</h2>
          <form action={addLabel} className="flex gap-2 items-center">
            <input name="name" placeholder="Label name" maxLength={40} className="rounded border px-2 py-1" />
            <input name="color" placeholder="#2563EB" className="rounded border px-2 py-1 w-28" />
            <button type="submit" className="rounded bg-gray-900 text-white px-3 py-1 text-sm">
              Add
            </button>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          {labels.map((l) => (
            <span key={l.id} className="px-3 py-1 rounded-full text-sm" style={{ background: l.color, color: "white" }}>
              {l.name}
            </span>
          ))}
          {labels.length === 0 && <p className="text-sm text-gray-600">No labels yet.</p>}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Board</h2>
          <form className="flex flex-wrap items-center gap-2 text-sm" method="get">
            <input type="hidden" name="projectId" value={project.id} />
            <input name="q" placeholder="Search title" defaultValue={search} className="rounded border px-2 py-1" />
            <select name="status" defaultValue={statusFilter.join(",")} className="rounded border px-2 py-1">
              <option value="">All statuses</option>
              {project.statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select name="assignee" defaultValue={assigneeFilter} className="rounded border px-2 py-1">
              <option value="">Any assignee</option>
              {project.team.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name || m.user?.email}
                </option>
              ))}
            </select>
            <select name="priority" defaultValue={priorityFilter} className="rounded border px-2 py-1">
              <option value="">Any priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select name="sort" defaultValue={sort} className="rounded border px-2 py-1">
              <option value="createdAt">Created</option>
              <option value="updatedAt">Updated</option>
              <option value="dueDate">Due</option>
              <option value="priority">Priority</option>
            </select>
            <button className="rounded bg-gray-900 text-white px-3 py-1" type="submit">
              Filter
            </button>
          </form>
        </div>
        <details className="rounded border p-3 bg-gray-50 text-sm">
          <summary className="cursor-pointer font-semibold">Add custom status</summary>
          <form action={addStatus} className="mt-3 flex flex-wrap gap-2 items-center">
            <input name="name" placeholder="Name" maxLength={40} className="rounded border px-2 py-1" required />
            <input name="color" placeholder="#2563EB" className="rounded border px-2 py-1 w-28" />
            <input name="wipLimit" type="number" min={0} max={50} placeholder="WIP (0=∞)" className="rounded border px-2 py-1 w-28" />
            <button className="rounded bg-gray-900 text-white px-3 py-1" type="submit">Add</button>
          </form>
          <p className="text-xs text-gray-500 mt-1">Up to 5 custom statuses. WIP 1-50 or 0 for unlimited.</p>
        </details>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {issuesByStatus.map(({ status, issues }) => (
            <div key={status.id} className="rounded border bg-white shadow-sm p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold" style={{ color: status.color }}>
                    {status.name}
                  </p>
                  <form action={updateWip} className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                    <input type="hidden" name="statusId" value={status.id} />
                    <span>WIP</span>
                    <input type="number" name="wipLimit" min={0} max={50} defaultValue={status.wipLimit} className="w-16 rounded border px-1 py-0.5" />
                    <span className="text-[11px]">(0 = ∞)</span>
                    <button type="submit" className="text-[11px] text-blue-600">Save</button>
                  </form>
                  {status.wipLimit > 0 && (
                    <p className="text-xs text-gray-500">Current {issues.length}/{status.wipLimit}</p>
                  )}
                </div>
              </div>
              {issues.map((issue, idx) => (
                <article key={issue.id} className="rounded border p-3 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <a className="font-semibold underline" href={`/projects/${project.id}/issues/${issue.id}`}>
                        {issue.title}
                      </a>
                      <p className="text-xs text-gray-500">#{issue.id.slice(0, 6)}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100">{issue.priority}</span>
                  </div>
                  {issue.description && <p className="text-sm text-gray-700 line-clamp-3">{issue.description}</p>}
                  <div className="flex flex-wrap gap-1 text-xs">
                    {issue.labels.map((l) => (
                      <span key={l.id} className="px-2 py-0.5 rounded" style={{ background: l.label.color, color: "white" }}>
                        {l.label.name}
                      </span>
                    ))}
                    {issue.assignee && <span className="px-2 py-0.5 rounded bg-slate-200">{issue.assignee.name || issue.assignee.email}</span>}
                  </div>

                  <form action={move} className="flex items-center gap-2 text-sm">
                    <input type="hidden" name="issueId" value={issue.id} />
                    <input type="hidden" name="toOrder" value={idx} />
                    <label className="text-xs text-gray-500">Move</label>
                    <select name="statusId" className="rounded border px-2 py-1 text-sm" defaultValue={issue.statusId}>
                      {project.statuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="text-xs px-2 py-1 rounded bg-gray-900 text-white">
                      Go
                    </button>
                  </form>
                  <div className="flex gap-1 text-[11px] text-gray-600">
                    {idx > 0 && (
                      <form action={move}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <input type="hidden" name="statusId" value={status.id} />
                        <input type="hidden" name="toOrder" value={idx - 1} />
                        <button className="underline">↑</button>
                      </form>
                    )}
                    {idx < issues.length - 1 && (
                      <form action={move}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <input type="hidden" name="statusId" value={status.id} />
                        <input type="hidden" name="toOrder" value={idx + 1} />
                        <button className="underline">↓</button>
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
                        <input type="checkbox" checked={st.completed} readOnly />
                        <span className={st.completed ? "line-through" : ""}>{st.title}</span>
                        <button type="submit" className="text-[11px] text-blue-600">Toggle</button>
                      </form>
                    ))}
                    <form action={addSubtask} className="flex items-center gap-2 text-xs">
                      <input type="hidden" name="issueId" value={issue.id} />
                      <input name="title" placeholder="New subtask" className="rounded border px-2 py-1 flex-1" />
                      <button type="submit" className="px-2 py-1 rounded bg-gray-900 text-white">Add</button>
                    </form>
                  </div>
                </article>
              ))}

              {issues.length === 0 && <p className="text-xs text-gray-500">No issues</p>}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
