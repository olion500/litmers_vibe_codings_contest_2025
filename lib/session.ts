import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

// Support both Auth.js v5 (authjs.*) and legacy NextAuth (next-auth.*) cookie names.
const sessionCookieNames = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = sessionCookieNames
    .map((name) => cookieStore.get(name)?.value)
    .find(Boolean);

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.user.deletedAt) {
    await prisma.session.delete({ where: { sessionToken: token } }).catch(() => {});
    return null;
  }
  if (session.expires.getTime() < Date.now()) {
    await prisma.session.delete({ where: { sessionToken: token } }).catch(() => {});
    sessionCookieNames.forEach((name) => cookieStore.delete(name));
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
  const token = sessionCookieNames
    .map((name) => cookieStore.get(name)?.value)
    .find(Boolean);
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } }).catch(() => {});
  }
  sessionCookieNames.forEach((name) => cookieStore.delete(name));
}
