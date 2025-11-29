import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("__Secure-next-auth.session-token")?.value ||
    cookieStore.get("next-auth.session-token")?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expires.getTime() < Date.now()) {
    await prisma.session.delete({ where: { sessionToken: token } }).catch(() => {});
    cookieStore.delete("__Secure-next-auth.session-token");
    cookieStore.delete("next-auth.session-token");
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    },
    sessionToken: token,
  };
}

export async function requireSession() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  return session;
}

export async function clearSessionCookiesAndRecord() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("__Secure-next-auth.session-token")?.value ||
    cookieStore.get("next-auth.session-token")?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } }).catch(() => {});
  }
  cookieStore.delete("__Secure-next-auth.session-token");
  cookieStore.delete("next-auth.session-token");
}
