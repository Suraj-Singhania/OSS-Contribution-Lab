import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEFAULT_DIGEST_LIMITS,
  parseGitHubRepositoryUrl,
} from "@/lib/repository-digest";
import {
  createRepositoryDigest,
  RepositoryDigestError,
} from "@/server/repository-digest";

export const runtime = "nodejs";

const digestRequestSchema = z.object({
  url: z.string().trim().min(1).max(2_048),
  includePatterns: z
    .array(z.string().trim().min(1).max(200))
    .max(30)
    .default([]),
  excludePatterns: z
    .array(z.string().trim().min(1).max(200))
    .max(30)
    .default([]),
  includeReadme: z.boolean().default(true),
  maxFileSize: z
    .number()
    .int()
    .min(1_024)
    // Keep this in sync with the 100 MiB maximum exposed by the UI slider.
    .max(100 * 1_024 * 1_024)
    .default(DEFAULT_DIGEST_LIMITS.maxFileSize),
  maxTotalSize: z
    .number()
    .int()
    .min(5_000)
    .max(2_000_000)
    .default(DEFAULT_DIGEST_LIMITS.maxTotalSize),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Sign in to generate a repository digest." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Send a valid JSON request." },
      { status: 400 },
    );
  }

  const parsedRequest = digestRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { message: "Check the digest options and try again." },
      { status: 400 },
    );
  }

  try {
    const target = parseGitHubRepositoryUrl(parsedRequest.data.url);
    const digest = await createRepositoryDigest(target, parsedRequest.data);
    return NextResponse.json(digest);
  } catch (error) {
    if (error instanceof RepositoryDigestError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    if (error instanceof Error && isGitHubRequestError(error)) {
      return NextResponse.json(
        { message: githubErrorMessage(error) },
        { status: getErrorStatus(error) },
      );
    }
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Repository Digest could not be generated.",
      },
      { status: 400 },
    );
  }
}

function isGitHubRequestError(
  error: Error,
): error is Error & { status: number } {
  return "status" in error && typeof error.status === "number";
}

function getErrorStatus(error: Error & { status: number }) {
  return error.status === 404 ? 404 : error.status === 403 ? 403 : 502;
}

function githubErrorMessage(error: Error & { status: number }) {
  if (error.status === 404) {
    return "GitHub could not find that public repository, branch, or path.";
  }
  if (error.status === 403) {
    return "GitHub denied this request. Add a server-side GITHUB_TOKEN or try again later.";
  }
  return "GitHub could not read this repository right now. Please try again.";
}
