import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_DIGEST_LIMITS, parseGitHubRepositoryUrl } from "@/lib/repository-digest";
import { renderMarkdownContext } from "@/lib/repository-context";
import { db } from "@/server/db";
import { createRepositoryDigest } from "@/server/repository-digest";

export const runtime = "nodejs";

const previewSchema = z.object({
  projectId: z.string().cuid(),
  mode: z.enum(["entire", "selected"]),
  paths: z.array(z.string().min(1).max(500)).max(500).default([]),
});

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in to browse project files." }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ message: "Project is required." }, { status: 400 });
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null, userToProjects: { some: { userId } } },
    select: { githubUrl: true },
  });
  if (!project) return NextResponse.json({ message: "Project not found." }, { status: 404 });
  try {
    const digest = await createRepositoryDigest(parseGitHubRepositoryUrl(project.githubUrl), {
      includePatterns: [], excludePatterns: [], includeReadme: true,
      maxFileSize: DEFAULT_DIGEST_LIMITS.maxFileSize, maxTotalSize: DEFAULT_DIGEST_LIMITS.maxTotalSize,
    });
    const folders = new Set<string>();
    for (const { path } of digest.files) {
      const parts = path.split("/");
      parts.pop();
      for (let index = 1; index <= parts.length; index += 1) folders.add(parts.slice(0, index).join("/"));
    }
    return NextResponse.json({ files: digest.files.map(({ path }) => path), folders: [...folders].sort(), limited: digest.stats.filesSkipped > 0 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not list repository files." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in to generate codebase context." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Send a valid context request." }, { status: 400 }); }
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Choose valid repository files." }, { status: 400 });
  if (parsed.data.mode === "selected" && parsed.data.paths.length === 0) return NextResponse.json({ message: "Select at least one file or folder." }, { status: 400 });

  const project = await db.project.findFirst({
    where: { id: parsed.data.projectId, deletedAt: null, userToProjects: { some: { userId } } },
    select: { githubUrl: true },
  });
  if (!project) return NextResponse.json({ message: "Project not found." }, { status: 404 });
  try {
    const patterns = parsed.data.mode === "selected" ? parsed.data.paths.map((path) => path.endsWith("/") ? `${path.replace(/\/$/, "")}/**` : path) : [];
    const digest = await createRepositoryDigest(parseGitHubRepositoryUrl(project.githubUrl), {
      includePatterns: patterns, excludePatterns: [], includeReadme: true,
      maxFileSize: DEFAULT_DIGEST_LIMITS.maxFileSize, maxTotalSize: DEFAULT_DIGEST_LIMITS.maxTotalSize,
    });
    const markdown = renderMarkdownContext(digest.files, digest.tree, digest.warnings);
    return NextResponse.json({ markdown, fileCount: digest.files.length, characters: markdown.length, limited: digest.stats.filesSkipped > 0, paths: digest.files.map(({ path }) => path) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not generate Markdown context." }, { status: 502 });
  }
}

