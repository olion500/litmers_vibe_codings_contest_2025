import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { projectSchemas } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

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
    <AppShell>
      <main className="max-w-5xl mx-auto py-6 space-y-8">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Projects</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">New project</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
              </DialogHeader>
              <form action={createProject} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="teamId">Team</Label>
                  <select
                    name="teamId"
                    id="teamId"
                    required
                    defaultValue=""
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="name">Name</Label>
                  <Input name="name" id="name" required minLength={1} maxLength={100} />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="description">Description (markdown)</Label>
                  <Textarea name="description" id="description" maxLength={2000} rows={4} />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Create projects and manage favorites, archive, and stats.</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {projects.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <a className="text-xl font-semibold hover:underline" href={`/projects/${p.id}`}>
                    {p.name}
                  </a>
                  <p className="text-sm text-muted-foreground">Team: {p.team.name}</p>
                  {p.archivedAt && <Badge variant="secondary">Archived</Badge>}
                </div>
                <div className="flex gap-2">
                  <form action={toggleFavorite}>
                    <input type="hidden" name="projectId" value={p.id} />
                    <Button variant="outline" size="sm" type="submit">
                      {p.favorites.length ? "★ Unfavorite" : "☆ Favorite"}
                    </Button>
                  </form>
                  <form action={toggleArchive}>
                    <input type="hidden" name="projectId" value={p.id} />
                    <Button variant="outline" size="sm" type="submit">
                      {p.archivedAt ? "Restore" : "Archive"}
                    </Button>
                  </form>
                </div>
              </div>
              {p.description && <p className="text-sm text-foreground/80 whitespace-pre-line">{p.description}</p>}
            </CardContent>
          </Card>
        ))}

        {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
      </div>
      </main>
    </AppShell>
  );
}
