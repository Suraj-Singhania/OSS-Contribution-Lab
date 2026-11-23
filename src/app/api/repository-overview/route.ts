import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { parseGitHubRepositoryUrl } from "@/lib/repository-digest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Sign in to view repository activity." }, { status: 401 });
  }

  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ message: "A GitHub repository URL is required." }, { status: 400 });
  }

  try {
    const { owner, repo } = parseGitHubRepositoryUrl(url);
    const [issuesResponse, pullRequestsResponse, commitsResponse] = await Promise.all([
      octokit.rest.issues.listForRepo({ owner, repo, state: "open", per_page: 100 }),
      octokit.rest.pulls.list({ owner, repo, state: "open", per_page: 20, sort: "updated", direction: "desc" }),
      octokit.rest.repos.listCommits({ owner, repo, per_page: 10 }),
    ]);

    const issues = issuesResponse.data
      .filter((item) => !item.pull_request)
      .slice(0, 20)
      .map(({ number, title, html_url, created_at }) => ({
        number,
        title,
        url: html_url,
        date: created_at,
      }));
    const pullRequests = pullRequestsResponse.data.map(
      ({ number, title, html_url, updated_at }) => ({
        number,
        title,
        url: html_url,
        date: updated_at,
      }),
    );
    const commits = commitsResponse.data.map((commit) => ({
      hash: commit.sha,
      message: commit.commit.message.split("\n", 1)[0] ?? "(no commit message)",
      author: commit.commit.author?.name ?? commit.author?.login ?? "Unknown author",
      date: commit.commit.author?.date ?? "",
      url: commit.html_url,
    }));

    return NextResponse.json({ issues, pullRequests, commits });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : 0;
    return NextResponse.json(
      {
        message:
          status === 404
            ? "This public GitHub repository could not be found."
            : status === 403
              ? "GitHub rate limited this request. Try again later or configure GITHUB_TOKEN."
              : error instanceof Error
                ? error.message
                : "Could not load repository activity.",
      },
      { status: status === 404 || status === 403 ? status : 400 },
    );
  }
}
