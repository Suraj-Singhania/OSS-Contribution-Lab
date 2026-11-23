import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // Clerk's development tokens can be issued slightly ahead of a local clock.
  // Keep production at the SDK's default tolerance.
  clockSkewInMs: process.env.NODE_ENV === "development" ? 15_000 : 5_000,
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
