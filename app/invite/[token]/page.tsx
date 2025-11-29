import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function acceptInviteAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const session = await requireSession();

  const invite = await prisma.teamInvite.findUnique({ where: { token }, include: { team: true } });
  if (!invite || invite.expiresAt < new Date()) {
    redirect("/teams?error=invite-invalid");
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

    const existing = await tx.teamMember.findUnique({ where: { teamId_userId: { teamId: invite.teamId, userId: session.user.id } } });
    if (existing) {
      if (existing.deletedAt) {
        await tx.teamMember.update({ where: { id: existing.id }, data: { deletedAt: null } });
      }
    } else {
      await tx.teamMember.create({ data: { teamId: invite.teamId, userId: session.user.id } });
    }
  });

  revalidatePath("/teams");
  redirect("/teams");
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const session = await requireSession();
  const invite = await prisma.teamInvite.findUnique({ where: { token: params.token }, include: { team: true } });

  if (!invite) {
    return <div className="max-w-xl mx-auto py-12">Invitation not found.</div>;
  }

  if (invite.expiresAt < new Date()) {
    return <div className="max-w-xl mx-auto py-12">Invitation expired.</div>;
  }

  return (
    <main className="max-w-xl mx-auto py-12 space-y-4">
      <h1 className="text-2xl font-semibold">Accept invitation</h1>
      <p>You are signed in as {session.user.email}.</p>
      <p>Team: {invite.team.name}</p>
      <form action={acceptInviteAction} className="space-y-3">
        <input type="hidden" name="token" value={params.token} />
        <button className="rounded bg-black text-white px-4 py-2" type="submit">
          Join team
        </button>
      </form>
    </main>
  );
}
