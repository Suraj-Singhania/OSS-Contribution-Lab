import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { z } from "zod";

import { env } from "@/env";
import { parseGitHubRepositoryUrl } from "@/lib/repository-digest";
import { db } from "@/server/db";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().cuid(),
  kind: z.enum(["issue", "pull_request"]),
  number: z.number().int().positive(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Sign in to summarize repository activity." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Send a valid summary request." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Choose a valid issue or pull request." },
      { status: 400 },
    );
  }

  const project = await db.project.findFirst({
    where: {
      id: parsed.data.projectId,
      deletedAt: null,
      userToProjects: { some: { userId } },
    },
    select: { githubUrl: true },
  });
  if (!project) {
    return NextResponse.json(
      { message: "Project not found." },
      { status: 404 },
    );
  }

  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { message: "Configure GEMINI_API_KEY on the server to enable summaries." },
      { status: 400 },
    );
  }

  try {
    const { owner, repo } = parseGitHubRepositoryUrl(project.githubUrl);
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const activity =
      parsed.data.kind === "pull_request"
        ? await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: parsed.data.number,
          })
        : await octokit.rest.issues.get({
            owner,
            repo,
            issue_number: parsed.data.number,
          });
    const bodyText =
      activity.data.body?.slice(0, 30_000) || "No description was provided.";
    const summary = await generateSummary({
      apiKey,
      kind: parsed.data.kind,
      title: activity.data.title,
      body: bodyText,
      url: activity.data.html_url,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : 0;
    return NextResponse.json(
      {
        message:
          status === 404
            ? "GitHub could not find that issue or pull request."
            : status === 403
              ? "GitHub or the AI provider denied this request. Check the configured keys or try again later."
            : error instanceof Error
              ? error.message
                : "Could not summarize this repository activity.",
      },
      { status: status === 404 || status === 403 ? status : 502 },
    );
  }
}

async function generateSummary(input: {
  apiKey: string;
  kind: "issue" | "pull_request";
  title: string;
  body: string;
  url: string;
}) {
  const kindLabel = input.kind === "issue" ? "issue" : "pull request";
  const prompt = `Summarize this GitHub ${kindLabel} in exactly three concise bullet points. Cover the goal, the important details or changes, and any stated outcome or open concern. Use only the supplied information; do not guess. Use plain language without emojis or decorative symbols.\n\nTitle: ${input.title}\nURL: ${input.url}\nDescription:\n${input.body}`;

  if (input.apiKey.startsWith("sk-")) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 350,
      }),
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(
        payload.error?.message ?? "The OpenAI summary request failed.",
      );
    const summary = payload.choices?.[0]?.message?.content;
    if (typeof summary !== "string" || !summary.trim())
      throw new Error("The AI returned an empty summary.");
    return summary.trim();
  }

  const model = new GoogleGenerativeAI(input.apiKey).getGenerativeModel({
    model: "gemini-3.5-flash-lite",
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 350 },
  });
  const summary = result.response.text();
  if (!summary.trim()) throw new Error("The AI returned an empty summary.");
  return summary.trim();
}
