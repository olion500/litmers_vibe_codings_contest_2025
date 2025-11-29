import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const session = await requireSession();
  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      deletedAt: null,
      team: { members: { some: { userId: session.user.id, deletedAt: null } }, deletedAt: null },
    },
    include: {
      team: true,
    },
  });

  if (!project) notFound();

  return (
    <main className="max-w-4xl mx-auto py-10 space-y-6">
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

      <section className="rounded border p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Status</h2>
        <p className="text-sm text-gray-700">Issues and board will appear here once implemented.</p>
      </section>

      <section className="rounded border p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Tabs</h2>
        <div className="flex gap-3 text-sm text-gray-700">
          <span>Issues (coming soon)</span>
          <span>Board (coming soon)</span>
        </div>
      </section>
    </main>
  );
}
