import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { teamSchemas } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { TeamRole } from "@prisma/client";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/sidebar";

async function createTeam(formData: FormData) {
  "use server";
  const session = await requireSession();
  const parsed = teamSchemas.create.safeParse({ name: formData.get("name") });
  if (!parsed.success) redirect("/teams?error=invalid-name");

  await prisma.team.create({
    data: {
      name: parsed.data.name,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: TeamRole.OWNER },
      },
    },
  });

  revalidatePath("/teams");
}

async function renameTeam(formData: FormData) {
  "use server";
  const session = await requireSession();
  const teamId = String(formData.get("teamId"));
  const parsed = teamSchemas.rename.safeParse({ name: formData.get("name") });
  if (!parsed.success) redirect("/teams?error=invalid-name");

  const membership = await prisma.teamMember.findFirst({ where: { teamId, userId: session.user.id, deletedAt: null }, include: { team: true } });
  if (!membership || membership.team.deletedAt) redirect("/teams");
  if (membership.role === TeamRole.MEMBER) redirect("/teams?error=forbidden");

  await prisma.team.update({ where: { id: teamId }, data: { name: parsed.data.name } });
  revalidatePath("/teams");
}

async function deleteTeam(formData: FormData) {
  "use server";
  const session = await requireSession();
  const teamId = String(formData.get("teamId"));
  const membership = await prisma.teamMember.findFirst({ where: { teamId, userId: session.user.id, deletedAt: null }, include: { team: true } });
  if (!membership || membership.team.deletedAt) redirect("/teams");
  if (membership.role !== TeamRole.OWNER) redirect("/teams?error=forbidden");

  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
    await tx.teamMember.updateMany({ where: { teamId }, data: { deletedAt: new Date() } });
    await tx.teamInvite.deleteMany({ where: { teamId } });
  });
  revalidatePath("/teams");
}

async function leaveTeam(formData: FormData) {
  "use server";
  const session = await requireSession();
  const teamId = String(formData.get("teamId"));
  const membership = await prisma.teamMember.findFirst({ where: { teamId, userId: session.user.id, deletedAt: null }, include: { team: true } });
  if (!membership || membership.team.deletedAt) redirect("/teams");
  if (membership.role === TeamRole.OWNER) redirect("/teams?error=owner-cannot-leave");

  await prisma.teamMember.update({ where: { id: membership.id }, data: { deletedAt: new Date() } });
  revalidatePath("/teams");
}

async function sendInvite(formData: FormData) {
  "use server";
  const session = await requireSession();
  const teamId = String(formData.get("teamId"));
  const parsed = teamSchemas.invite.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/teams?error=invalid-email");

  const membership = await prisma.teamMember.findFirst({ where: { teamId, userId: session.user.id, deletedAt: null }, include: { team: true } });
  if (!membership || membership.team.deletedAt) redirect("/teams");
  if (membership.role === TeamRole.MEMBER) redirect("/teams?error=forbidden");

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.teamInvite.upsert({
    where: { teamId_email: { teamId, email: parsed.data.email } },
    update: { token, expiresAt, acceptedAt: null, createdById: session.user.id },
    create: { teamId, email: parsed.data.email, token, expiresAt, createdById: session.user.id },
  });

  revalidatePath("/teams");
}

export default async function TeamsPage() {
  const session = await requireSession();
  const memberships = await prisma.teamMember.findMany({
    where: { userId: session.user.id, deletedAt: null, team: { deletedAt: null } },
    include: {
      team: {
        include: {
          members: { where: { deletedAt: null }, include: { user: true } },
          invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } },
          activities: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell>
      <main className="max-w-4xl mx-auto py-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTeam} className="flex flex-col gap-3 sm:flex-row">
            <Input
              name="name"
              placeholder="Team name"
              minLength={1}
              maxLength={50}
              required
            />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {memberships.map((m) => (
          <Card key={m.id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{m.team.name}</h2>
                  <p className="text-sm text-muted-foreground">Your role: {m.role}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {m.role !== TeamRole.MEMBER && (
                    <form action={renameTeam} className="flex gap-2">
                      <input type="hidden" name="teamId" value={m.teamId} />
                      <Input
                        name="name"
                        defaultValue={m.team.name}
                        minLength={1}
                        maxLength={50}
                        className="w-44"
                      />
                      <Button variant="outline" size="sm" type="submit">
                        Rename
                      </Button>
                    </form>
                  )}
                  {m.role === TeamRole.OWNER ? (
                    <form action={deleteTeam}>
                      <input type="hidden" name="teamId" value={m.teamId} />
                      <Button variant="destructive" size="sm" type="submit">
                        Delete
                      </Button>
                    </form>
                  ) : (
                    <form action={leaveTeam}>
                      <input type="hidden" name="teamId" value={m.teamId} />
                      <Button variant="outline" size="sm" type="submit">
                        Leave
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Members</h3>
                <ul className="text-sm text-foreground/80 space-y-1">
                  {m.team.members.map((mem) => (
                    <li key={mem.id} className="flex items-center gap-2">
                      <span>{mem.user?.email || "user"}</span>
                      <Badge variant="secondary">{mem.role}</Badge>
                    </li>
                  ))}
                </ul>
              </div>

              {(m.role === TeamRole.OWNER || m.role === TeamRole.ADMIN) && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Invites (pending)</h3>
                  <ul className="text-sm text-foreground/80 space-y-1">
                    {m.team.invites.length === 0 && <li>No pending invites</li>}
                    {m.team.invites.map((inv) => (
                      <li key={inv.id}>
                        {inv.email} — expires {inv.expiresAt.toISOString().slice(0, 10)}
                      </li>
                    ))}
                  </ul>
                  <form action={sendInvite} className="flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="teamId" value={m.teamId} />
                    <Input
                      name="email"
                      type="email"
                      placeholder="invitee@example.com"
                      required
                    />
                    <Button type="submit">Invite</Button>
                  </form>
                </div>
              )}

              <div>
                <h3 className="font-semibold">Recent activity</h3>
                <ul className="text-sm text-foreground/80 space-y-1">
                  {m.team.activities.length === 0 && <li>No activity yet.</li>}
                  {m.team.activities.map((a) => (
                    <li key={a.id}>
                      {a.message} — {a.createdAt.toISOString().slice(0, 10)}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}

        {memberships.length === 0 && (
          <p className="text-sm text-muted-foreground">You have no teams yet. Create one above.</p>
        )}
      </div>
      </main>
    </AppShell>
  );
}
