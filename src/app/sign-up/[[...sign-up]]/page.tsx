import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSafeAuthRedirectPath } from "@/lib/auth-redirect";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}) {
  const { redirect_url: redirectUrl } = await searchParams;
  const nextPath = await getSafeAuthRedirectPath(redirectUrl);
  const syncUrl = `/sync-user?next=${encodeURIComponent(nextPath)}`;

  if ((await auth()).userId) {
    redirect(syncUrl);
  }

  return <SignUp forceRedirectUrl={syncUrl} fallbackRedirectUrl={syncUrl} />;
}
