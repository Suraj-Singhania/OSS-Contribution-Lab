import { headers } from "next/headers";

export async function getSafeAuthRedirectPath(
  candidate: string | string[] | undefined,
) {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (!value) return "/dashboard";

  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host");
    if (!host) return "/dashboard";
    const protocol = (requestHeaders.get("x-forwarded-proto") ?? "http")
      .split(",", 1)[0]
      ?.trim();
    if (!protocol) return "/dashboard";
    const origin = `${protocol}://${host}`;
    let target = new URL(value, origin);
    for (let redirects = 0; redirects < 5; redirects += 1) {
      if (target.origin !== origin) return "/dashboard";

      if (target.pathname === "/sync-user") {
        target = new URL(target.searchParams.get("next") ?? "/dashboard", origin);
        continue;
      }

      if (
        target.pathname === "/sign-in" ||
        target.pathname.startsWith("/sign-in/") ||
        target.pathname === "/sign-up" ||
        target.pathname.startsWith("/sign-up/")
      ) {
        return "/dashboard";
      }

      return `${target.pathname}${target.search}${target.hash}`;
    }
    return "/dashboard";
  } catch {
    return "/dashboard";
  }
}
