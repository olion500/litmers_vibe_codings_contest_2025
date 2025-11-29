import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function IssueDetailPage({ params }: { params: { projectId: string; issueId: string } }) {
  const session = await requireSession();

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
    </main>
  );
}
