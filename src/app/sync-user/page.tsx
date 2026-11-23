import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getSafeAuthRedirectPath } from "@/lib/auth-redirect";
import { db } from "@/server/db";

const SyncUser = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) => {
  const { userId } = await auth.protect();
  const { next } = await searchParams;
  const nextPath = await getSafeAuthRedirectPath(next);

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  if (!user.emailAddresses[0]?.emailAddress) {
    return notFound();
  }
  await db.user.upsert({
    where: { emailAddress: user.emailAddresses[0]?.emailAddress ?? "" },
    update: {
      imageUrl: user.imageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    create: {
      id: userId,
      emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: user.imageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
  return redirect(nextPath);
};

export default SyncUser;
