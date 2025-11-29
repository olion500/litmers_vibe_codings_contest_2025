import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="max-w-2xl mx-auto py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Signed in as</p>
          <p className="text-xl font-semibold">{session.user.email}</p>
        </div>
        <form action={handleSignOut}>
          <button className="rounded bg-black text-white px-3 py-2" type="submit">
            Sign out
          </button>
        </form>
      </div>
      <div className="rounded border p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold">Welcome</h2>
        <p className="text-gray-700">Auth foundations are wired. Continue building the Jira Lite experience.</p>
      </div>
    </main>
  );
}
