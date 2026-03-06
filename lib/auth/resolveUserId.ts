import { cookies } from "next/headers";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Resolves the authenticated user or guest user ID.
 * Supports isolated guest sessions so each guest gets their own sandbox.
 */
export const resolveUserId = async (): Promise<string> => {
  const session = await getServerAuthSession();

  // 1. Authenticated User
  if (session?.user?.email) {
    const email = session.user.email;
    const name = session.user.name ?? "User";
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name },
      update: session.user.name ? { name } : {},
      select: { id: true }
    });
    return user.id;
  }

  // 2. Guest User (using guestId cookie)
  const cookieStore = cookies();
  const guestId = cookieStore.get("guestId")?.value;

  if (guestId) {
    const email = `guest_${guestId}@vaaniledger.local`;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: "Guest User" },
      update: {}, // Guests don't change names
      select: { id: true }
    });
    return user.id;
  }

  // 3. Fallback to generic Demo User (should rarely happen now if frontend is setting cookies)
  const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@vaaniledger.local";
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, name: "Demo User" },
    update: {},
    select: { id: true }
  });
  return user.id;
};
