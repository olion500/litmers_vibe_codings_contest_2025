import { prisma } from "@/lib/prisma";
import { profileSchemas } from "@/lib/validation";
import { validatePassword, hashPassword, verifyPassword } from "@/lib/password";
import { redirect } from "next/navigation";
import { clearSessionCookiesAndRecord, requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
        <p className="text-muted-foreground">Update your details, change password, or delete your account.</p>
        {error && <p className="text-sm text-destructive mt-2">Error: {error.replace(/-/g, " ")}</p>}
        {success && <p className="text-sm text-green-700 mt-2">Saved: {success.replace(/-/g, " ")}</p>}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile info</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name ?? ""}
                required
                minLength={1}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Avatar URL</Label>
              <Input
                id="image"
                name="image"
                defaultValue={user.image ?? ""}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">Upload support can be added later; paste an image URL for now.</p>
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Change password</CardTitle>
          {isOAuthOnly && <span className="text-xs text-muted-foreground">Unavailable for Google-only accounts</span>}
        </CardHeader>
        <CardContent>
          <form action={changePassword} className="space-y-4">
            <fieldset disabled={isOAuthOnly} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  minLength={6}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  minLength={6}
                  maxLength={100}
                  required
                />
              </div>
              <Button type="submit">Update password</Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-700">Delete account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground/80">
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
                <Checkbox name="confirm" value="true" required className="h-4 w-4" />
                I understand this will delete my account.
              </label>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">Confirm with password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  maxLength={100}
                  required
                />
              </div>
            )}

            <Button variant="destructive" type="submit">
              Delete account
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
