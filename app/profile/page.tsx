import { prisma } from "@/lib/prisma";
import { profileSchemas } from "@/lib/validation";
import { validatePassword, hashPassword, verifyPassword } from "@/lib/password";
import { redirect } from "next/navigation";
import { clearSessionCookiesAndRecord, requireSession } from "@/lib/session";

async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
}

async function userOwnsTeams(userId: string) {
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM "Team" WHERE "ownerId" = ${userId} AND "deletedAt" IS NULL
    `;
    return (rows[0]?.count ?? 0) > 0;
  } catch {
    // Team table not created yet; treat as no ownership.
    return false;
  }
}

async function updateProfile(formData: FormData) {
  "use server";
  const session = await requireSession();

  const parsed = profileSchemas.updateProfile.safeParse({
    name: formData.get("name"),
    image: formData.get("image") ?? undefined,
  });

  if (!parsed.success) redirect("/profile?error=invalid-profile");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      image: parsed.data.image ? String(parsed.data.image) || null : null,
    },
  });

  redirect("/profile?success=profile");
}

async function changePassword(formData: FormData) {
  "use server";
  const session = await requireSession();

  const parsed = profileSchemas.changePassword.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) redirect("/profile?error=invalid-password-input");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) redirect("/profile?error=oauth-only");

  const currentOk = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!currentOk) redirect("/profile?error=wrong-password");

  if (!validatePassword(parsed.data.newPassword)) redirect("/profile?error=invalid-password-length");

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  redirect("/profile?success=password");
}

async function deleteAccount(formData: FormData) {
  "use server";
  const session = await requireSession();

  const method = formData.get("method") === "oauth" ? "oauth" : "password";
  const payload =
    method === "oauth"
      ? { method: "oauth" as const, confirm: formData.get("confirm") === "true" }
      : { method: "password" as const, password: formData.get("password") };

  const parsed = profileSchemas.deleteAccount.safeParse(payload);
  if (!parsed.success) redirect("/profile?error=invalid-delete-input");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  // Ownership guard: block if user owns teams (when table exists).
  const ownsTeams = await userOwnsTeams(user.id);
  if (ownsTeams) redirect("/profile?error=owns-teams");

  if (parsed.data.method === "password") {
    if (!user.passwordHash) redirect("/profile?error=oauth-only");
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) redirect("/profile?error=wrong-password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date(), passwordHash: null },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });

  await clearSessionCookiesAndRecord();
  redirect("/login");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await requireSession();

  const user = await getUser(session.user.id);
  if (!user) redirect("/login");

  const isOAuthOnly = !user.passwordHash;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const success = typeof searchParams.success === "string" ? searchParams.success : null;

  return (
    <main className="max-w-3xl mx-auto py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="text-gray-600">Update your details, change password, or delete your account.</p>
        {error && <p className="text-sm text-red-600 mt-2">Error: {error.replace(/-/g, " ")}</p>}
        {success && <p className="text-sm text-green-700 mt-2">Saved: {success.replace(/-/g, " ")}</p>}
      </header>

      <section className="rounded border p-6 space-y-4 bg-white shadow-sm">
        <h2 className="text-xl font-semibold">Profile info</h2>
        <form action={updateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              name="name"
              defaultValue={user.name ?? ""}
              required
              minLength={1}
              maxLength={50}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Avatar URL</label>
            <input
              name="image"
              defaultValue={user.image ?? ""}
              placeholder="https://..."
              className="mt-1 w-full rounded border px-3 py-2"
            />
            <p className="text-xs text-gray-500">Upload support can be added later; paste an image URL for now.</p>
          </div>
          <button className="rounded bg-black text-white px-4 py-2">Save profile</button>
        </form>
      </section>

      <section className="rounded border p-6 space-y-4 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Change password</h2>
          {isOAuthOnly && <span className="text-xs text-gray-600">Unavailable for Google-only accounts</span>}
        </div>
        <form action={changePassword} className="space-y-4">
          <fieldset disabled={isOAuthOnly} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Current password</label>
              <input
                name="currentPassword"
                type="password"
                className="mt-1 w-full rounded border px-3 py-2"
                minLength={6}
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">New password</label>
              <input
                name="newPassword"
                type="password"
                className="mt-1 w-full rounded border px-3 py-2"
                minLength={6}
                maxLength={100}
                required
              />
            </div>
            <button className="rounded bg-black text-white px-4 py-2" type="submit">
              Update password
            </button>
          </fieldset>
        </form>
      </section>

      <section className="rounded border p-6 space-y-4 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-red-700">Delete account</h2>
        <p className="text-sm text-gray-700">
          This will soft delete your account. You cannot delete your account while owning teams; transfer ownership first.
        </p>

        <form action={deleteAccount} className="space-y-4">
          {isOAuthOnly ? (
            <input type="hidden" name="method" value="oauth" />
          ) : (
            <input type="hidden" name="method" value="password" />
          )}

          {isOAuthOnly ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirm" value="true" required className="h-4 w-4" />
              I understand this will delete my account.
            </label>
          ) : (
            <div>
              <label className="block text-sm font-medium">Confirm with password</label>
              <input
                name="password"
                type="password"
                className="mt-1 w-full rounded border px-3 py-2"
                minLength={6}
                maxLength={100}
                required
              />
            </div>
          )}

          <button className="rounded bg-red-600 text-white px-4 py-2" type="submit">
            Delete account
          </button>
        </form>
      </section>
    </main>
  );
}
