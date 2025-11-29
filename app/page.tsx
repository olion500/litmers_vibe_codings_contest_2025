import { redirect } from "next/navigation";
import { clearSessionCookiesAndRecord, requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await requireSession();

  async function handleSignOut() {
    "use server";
    await clearSessionCookiesAndRecord();
    redirect("/login");
  }

  return (
    <main className="max-w-2xl mx-auto py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="text-xl font-semibold">{session.user.email}</p>
        </div>
        <form action={handleSignOut} className="flex items-center gap-3">
          <a className="underline" href="/profile">
            Profile
          </a>
          <Button type="submit">Sign out</Button>
        </form>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/80">Auth foundations are wired. Continue building the Jira Lite experience.</p>
        </CardContent>
      </Card>
    </main>
  );
}
