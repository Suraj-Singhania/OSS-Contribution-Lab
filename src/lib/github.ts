import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { aiSummariseCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};
export const getCommitHashes = async (
  githubUrl: string,
): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL");
  }
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
  });
  const sortedCommits = data.sort(
    (a, b) =>
      new Date(b.commit.author?.date ?? "").getTime() -
      new Date(a.commit.author?.date ?? "").getTime(),
  );
  return sortedCommits.slice(0, 10).map((commit) => ({
    commitHash: commit.sha ?? "",
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit?.author?.name ?? "",
    commitAuthorAvatar: commit.author?.avatar_url ?? "",
    commitDate: commit.commit?.author?.date ?? "",
  }));
};

export const pollCommit = async (projectId: string) => {
  const { githubUrl } = await fetchProjectById(projectId);
  const commitHashes = await getCommitHashes(githubUrl || "");
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );
  const summariseResponse = await Promise.allSettled(
    unprocessedCommits.map((commit) => {
      return summariseCommit(githubUrl || "", commit.commitHash);
    }),
  );

  const summaries = summariseResponse.map((summary) => {
    if (summary.status === "fulfilled") {
      return summary.value;
    }
  });
  const commits = await db.commit.createMany({
    data: summaries.map((summary, idx) => ({
      projectId: projectId,
      commitHash: unprocessedCommits[idx]!.commitHash,
      summary: summary!,
      commitAuthorName: unprocessedCommits[idx]!.commitAuthorName,
      commitDate: unprocessedCommits[idx]!.commitDate,
      commitMessage: unprocessedCommits[idx]!.commitMessage,
      commitAuthorAvatar: unprocessedCommits[idx]!.commitAuthorAvatar,
    })),
  });
  return commits;
};

async function summariseCommit(githubUrl: string, commitHash: string) {
  // get the diff, then pass the diff into ai
  const { data } = await axios.get<string>(
    `${githubUrl}/commit/${commitHash}.diff`,
    {
      headers: {
        Accept: "application/vnd.github.v3.diff",
      },
    },
  );
  return (await aiSummariseCommit(data)) || "";
}
async function fetchProjectById(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      githubUrl: true,
    },
  });
  if (!project) {
    throw new Error("Project has no GitHub URL!");
  }
  return { project, githubUrl: project?.githubUrl };
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
  });
  const unprocessedCommits = commitHashes.filter(
    (commit) =>
      !processedCommits.some(
        (processedCommit) => processedCommit.commitHash === commit.commitHash,
      ),
  );
  return unprocessedCommits;
}
