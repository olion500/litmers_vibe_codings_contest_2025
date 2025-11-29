import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { projectSchemas } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const DEFAULT_STATUSES = [
  { name: "Backlog", kind: "BACKLOG", color: "#9CA3AF", position: 0 },
  { name: "In Progress", kind: "IN_PROGRESS", color: "#2563EB", position: 1 },
  { name: "Done", kind: "DONE", color: "#10B981", position: 2 },
];

async function createProject(formData: FormData) {
  "use server";
  const session = await requireSession();
  const parsed = projectSchemas.create.safeParse({
    teamId: formData.get("teamId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) redirect("/projects?error=invalid-project");

  const count = await prisma.project.count({ where: { teamId: parsed.data.teamId, deletedAt: null } });
  if (count >= 15) redirect("/projects?error=limit");

  // ensure membership and role not MEMBER
  const membership = await prisma.teamMember.findFirst({ where: { teamId: parsed.data.teamId, userId: session.user.id, deletedAt: null } });
  if (!membership || membership.teamId !== parsed.data.teamId) redirect("/projects?error=no-team");
  if (membership.role === "MEMBER") redirect("/projects?error=forbidden");

  await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        teamId: parsed.data.teamId,
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });

    await tx.status.createMany({ data: DEFAULT_STATUSES.map((s) => ({ ...s, projectId: project.id })) });
  });
  revalidatePath("/projects");
}

async function toggleFavorite(formData: FormData) {
  "use server";
  const session = await requireSession();
  const projectId = String(formData.get("projectId"));

  const existing = await prisma.projectFavorite.findUnique({ where: { projectId_userId: { projectId, userId: session.user.id } } });
  if (existing) {
    await prisma.projectFavorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.projectFavorite.create({ data: { projectId, userId: session.user.id } });
  }
  revalidatePath("/projects");
}

async function toggleArchive(formData: FormData) {
  "use server";
  const session = await requireSession();
  const projectId = String(formData.get("projectId"));
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      team: { members: { some: { userId: session.user.id, deletedAt: null } }, deletedAt: null },
    },
  });
  if (!project) redirect("/projects?error=not-found");

  await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: project.archivedAt ? null : new Date() },
  });
  revalidatePath("/projects");
}

export default async function ProjectsPage() {
  const session = await requireSession();
  const teams = await prisma.team.findMany({
    where: { deletedAt: null, members: { some: { userId: session.user.id, deletedAt: null } } },
    include: {
      members: { where: { userId: session.user.id, deletedAt: null } },
    },
    orderBy: { createdAt: "asc" },
  });

  const projects = await prisma.project.findMany({
    where: { deletedAt: null, team: { members: { some: { userId: session.user.id, deletedAt: null } } } },
    include: {
      team: true,
      favorites: { where: { userId: session.user.id } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="max-w-5xl mx-auto py-10 space-y-8">
      <section className="rounded border p-6 bg-white shadow-sm">
        <h1 className="text-2xl font-semibold mb-4">Projects</h1>
        <form action={createProject} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          <div>
            <label className="block text-sm font-medium">Team</label>
            <select
              name="teamId"
              required
              defaultValue=""
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="" disabled>
                Select team
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input name="name" required minLength={1} maxLength={100} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">Description (markdown)</label>
            <textarea name="description" maxLength={2000} className="mt-1 w-full rounded border px-3 py-2" rows={3} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="rounded bg-black text-white px-4 py-2" type="submit">
              Create
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-4">
        {projects.map((p) => (
          <article key={p.id} className="rounded border p-5 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <a className="text-xl font-semibold underline" href={`/projects/${p.id}`}>
                  {p.name}
                </a>
                <p className="text-sm text-gray-600">Team: {p.team.name}</p>
                {p.archivedAt && <p className="text-xs text-orange-600">Archived</p>}
              </div>
              <div className="flex gap-2">
                <form action={toggleFavorite}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <button className="rounded border px-3 py-1" type="submit">
                    {p.favorites.length ? "★ Unfavorite" : "☆ Favorite"}
                  </button>
                </form>
                <form action={toggleArchive}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <button className="rounded border px-3 py-1" type="submit">
                    {p.archivedAt ? "Restore" : "Archive"}
                  </button>
                </form>
              </div>
            </div>
            {p.description && <p className="text-sm text-gray-700 whitespace-pre-line">{p.description}</p>}
          </article>
        ))}

        {projects.length === 0 && <p className="text-sm text-gray-600">No projects yet.</p>}
      </div>
    </main>
  );
}
