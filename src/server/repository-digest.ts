import "server-only";

import { Octokit } from "octokit";

import {
  buildDirectoryTree,
  filterRepositoryFiles,
  formatDigest,
  isLikelyBinary,
  type DigestOptions,
  type RepositoryDigest,
  type RepositoryTreeFile,
  type RepositoryUrl,
} from "@/lib/repository-digest";

export async function createRepositoryDigest(
  target: RepositoryUrl,
  options: DigestOptions,
): Promise<RepositoryDigest> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const repository = await octokit.rest.repos.get({
    owner: target.owner,
    repo: target.repo,
  });

  if (repository.data.private) {
    throw new RepositoryDigestError(
      403,
      "Private repositories are not supported in Repository Digest yet.",
    );
  }

  const selection = await resolveSelection({
    octokit,
    target,
    defaultBranch: repository.data.default_branch,
  });
  const branch = await octokit.rest.repos.getBranch({
    owner: target.owner,
    repo: target.repo,
    branch: selection.branch,
  });
  const treeResponse = await octokit.rest.git.getTree({
    owner: target.owner,
    repo: target.repo,
    tree_sha: branch.data.commit.sha,
    recursive: "1",
  });

  const allFiles: RepositoryTreeFile[] = treeResponse.data.tree
    .filter(
      (
        entry,
      ): entry is typeof entry & { path: string; sha: string; size: number } =>
        entry.type === "blob" &&
        typeof entry.path === "string" &&
        typeof entry.sha === "string" &&
        typeof entry.size === "number",
    )
    .map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size,
    }));
  const scopedFiles = selectFilesAtPath(allFiles, selection.path);

  if (selection.path && scopedFiles.length === 0) {
    throw new RepositoryDigestError(
      404,
      `The path "${selection.path}" was not found on branch "${selection.branch}".`,
    );
  }

  const fullTree = buildDirectoryTree(scopedFiles.map((file) => file.path));

  let gitignorePatterns: string[] = [];
  const ignoreFile = scopedFiles.find((file) => file.path === ".gitignore");
  if (ignoreFile) {
    try {
      const blob = await octokit.rest.git.getBlob({ owner: target.owner, repo: target.repo, file_sha: ignoreFile.sha });
      const text = Buffer.from(blob.data.content.replace(/\s/g, ""), "base64").toString("utf8");
      gitignorePatterns = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && !line.startsWith("!")).map((line) => {
        const pattern = line.replace(/^\//, "").replace(/\/$/, "");
        return line.endsWith("/") ? `**/${pattern}/**` : pattern.includes("/") ? pattern : `**/${pattern}`;
      });
    } catch { /* A missing or unreadable .gitignore does not block repository context. */ }
  }
  const filtered = filterRepositoryFiles(scopedFiles, {
    ...options,
    excludePatterns: [...options.excludePatterns, ...gitignorePatterns],
  });
  const skipped = [...filtered.skipped];
  const files = [];
  let writtenCharacters = 0;

  for (const file of filtered.files) {
    try {
      const blob = await octokit.rest.git.getBlob({
        owner: target.owner,
        repo: target.repo,
        file_sha: file.sha,
      });
      const bytes = Buffer.from(blob.data.content.replace(/\s/g, ""), "base64");
      if (isLikelyBinary(bytes)) {
        skipped.push({ path: file.path, reason: "binary file content" });
        continue;
      }

      const content = bytes.toString("utf8");
      // The pre-filter reserves by GitHub's byte size; this is the final guard
      // against a character-based request limit before text reaches the response.
      if (writtenCharacters + content.length > options.maxTotalSize) {
        skipped.push({
          path: file.path,
          reason: "maximum total output size reached",
        });
        continue;
      }
      files.push({ path: file.path, content, size: file.size });
      writtenCharacters += content.length;
    } catch {
      skipped.push({
        path: file.path,
        reason: "could not read file from GitHub",
      });
    }
  }

  const sourceUrl = buildSourceUrl(target, selection.branch, selection.path);
  const warnings = [];
  if (treeResponse.data.truncated) {
    warnings.push(
      "GitHub truncated this repository tree; only the files returned by GitHub were considered.",
    );
  }

  // Headers and the directory tree count toward the actual text response too.
  // Remove files from the end until the rendered digest fits the requested cap.
  let rendered = formatDigest({
    repository: repository.data.full_name,
    sourceUrl,
    branch: selection.branch,
    selectedPath: selection.path,
    files,
    skipped,
    tree: fullTree,
    warnings,
  });
  while (rendered.digest.length > options.maxTotalSize && files.length > 0) {
    const removed = files.pop();
    if (removed) {
      skipped.push({
        path: removed.path,
        reason: "maximum total output size reached",
      });
    }
    rendered = formatDigest({
      repository: repository.data.full_name,
      sourceUrl,
      branch: selection.branch,
      selectedPath: selection.path,
      files,
      skipped,
      tree: fullTree,
      warnings,
    });
  }
  if (files.length === 0) {
    warnings.push("No readable text files matched the current options.");
  }

  return formatDigest({
    repository: repository.data.full_name,
    sourceUrl,
    branch: selection.branch,
    selectedPath: selection.path,
    files,
    skipped,
    tree: fullTree,
    warnings,
  });
}

export class RepositoryDigestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RepositoryDigestError";
  }
}

async function resolveSelection(input: {
  octokit: Octokit;
  target: RepositoryUrl;
  defaultBranch: string;
}): Promise<{ branch: string; path: string }> {
  if (input.target.treeReferenceSegments.length === 0) {
    return { branch: input.defaultBranch, path: "" };
  }

  const branches = await input.octokit.paginate(
    input.octokit.rest.repos.listBranches,
    {
      owner: input.target.owner,
      repo: input.target.repo,
      per_page: 100,
    },
  );
  const reference = input.target.treeReferenceSegments.join("/");
  const branch = branches
    .map((candidate) => candidate.name)
    .filter(
      (candidate) =>
        reference === candidate || reference.startsWith(`${candidate}/`),
    )
    .sort((a, b) => b.length - a.length)[0];

  if (!branch) {
    // Let GitHub's branch endpoint produce its familiar 404 for an unknown branch.
    return {
      branch: input.target.treeReferenceSegments[0]!,
      path: input.target.treeReferenceSegments.slice(1).join("/"),
    };
  }
  return {
    branch,
    path: input.target.treeReferenceSegments
      .slice(branch.split("/").length)
      .join("/"),
  };
}

function selectFilesAtPath(files: RepositoryTreeFile[], path: string) {
  if (!path) return files;
  return files.filter(
    (file) => file.path === path || file.path.startsWith(`${path}/`),
  );
}

function buildSourceUrl(target: RepositoryUrl, branch: string, path: string) {
  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${target.normalizedRepositoryUrl}/tree/${encodeURIComponent(branch)}${
    encodedPath ? `/${encodedPath}` : ""
  }`;
}
