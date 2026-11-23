export const DEFAULT_DIGEST_LIMITS = {
  maxFileSize: 50_000,
  maxTotalSize: 500_000,
} as const;

export const SKIPPED_DIRECTORY_NAMES = new Set([
  ".git",
  ".next",
  "assets",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "vendor",
]);

const BINARY_EXTENSIONS = new Set([
  "7z",
  "a",
  "avi",
  "bmp",
  "class",
  "dll",
  "dmg",
  "doc",
  "docx",
  "eot",
  "exe",
  "gif",
  "gz",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "mp3",
  "mp4",
  "o",
  "otf",
  "pdf",
  "png",
  "so",
  "tar",
  "ttf",
  "wasm",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xls",
  "xlsx",
  "zip",
]);

export type RepositoryUrl = {
  owner: string;
  repo: string;
  /** Segments after /tree/. They are resolved against actual branch names server-side. */
  treeReferenceSegments: string[];
  normalizedRepositoryUrl: string;
};

export type RepositoryTreeFile = {
  path: string;
  sha: string;
  size: number;
};

export type DigestFile = {
  path: string;
  content: string;
  size: number;
};

export type SkippedFile = {
  path: string;
  reason: string;
};

export type DigestOptions = {
  includePatterns: string[];
  excludePatterns: string[];
  includeReadme: boolean;
  maxFileSize: number;
  maxTotalSize: number;
};

export type RepositoryDigest = {
  repository: string;
  sourceUrl: string;
  branch: string;
  selectedPath: string;
  stats: {
    filesIncluded: number;
    filesSkipped: number;
    characters: number;
    estimatedTokens: number;
  };
  tree: string;
  digest: string;
  files: Pick<DigestFile, "path" | "content">[];
  skipped: SkippedFile[];
  warnings: string[];
};

export function parseGitHubRepositoryUrl(value: string): RepositoryUrl {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a complete https://github.com/owner/repo URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Only plain public https://github.com/owner/repo URLs are supported.",
    );
  }

  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
  const [owner, repoSegment, marker, ...treeReferenceSegments] = segments;
  const repo = repoSegment?.replace(/\.git$/i, "");

  if (!owner || !repo || !isGitHubName(owner) || !isGitHubRepoName(repo)) {
    throw new Error("Enter a valid GitHub owner and repository name.");
  }

  if (segments.length > 2 && marker !== "tree") {
    throw new Error("Use a repository URL or a URL beginning with /tree/.");
  }

  if (marker === "tree" && treeReferenceSegments.length === 0) {
    throw new Error("The /tree/ URL needs a branch name.");
  }

  if (treeReferenceSegments.some((segment) => !isSafePathSegment(segment))) {
    throw new Error("The selected repository path is not valid.");
  }

  return {
    owner,
    repo,
    treeReferenceSegments,
    normalizedRepositoryUrl: `https://github.com/${owner}/${repo}`,
  };
}

export function filterRepositoryFiles(
  files: RepositoryTreeFile[],
  options: DigestOptions,
): { files: RepositoryTreeFile[]; skipped: SkippedFile[] } {
  const included: RepositoryTreeFile[] = [];
  const skipped: SkippedFile[] = [];
  let reservedOutput = 0;

  for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
    const normalizedPath = file.path.replace(/^\/+/, "");

    if (isSensitivePath(normalizedPath)) {
      skipped.push({ path: file.path, reason: "sensitive file" });
    } else if (hasSkippedDirectory(normalizedPath)) {
      skipped.push({
        path: file.path,
        reason: "generated or dependency directory",
      });
    } else if (!options.includeReadme && isReadme(normalizedPath)) {
      skipped.push({ path: file.path, reason: "README disabled" });
    } else if (isBinaryExtension(normalizedPath)) {
      skipped.push({ path: file.path, reason: "binary file extension" });
    } else if (
      options.includePatterns.length > 0 &&
      !options.includePatterns.some((pattern) =>
        matchesGlob(normalizedPath, pattern),
      )
    ) {
      skipped.push({
        path: file.path,
        reason: "does not match include patterns",
      });
    } else if (
      options.excludePatterns.some((pattern) =>
        matchesGlob(normalizedPath, pattern),
      )
    ) {
      skipped.push({ path: file.path, reason: "matches exclude pattern" });
    } else if (file.size > options.maxFileSize) {
      skipped.push({ path: file.path, reason: "exceeds maximum file size" });
    } else if (reservedOutput + file.size > options.maxTotalSize) {
      skipped.push({
        path: file.path,
        reason: "maximum total output size reached",
      });
    } else {
      included.push(file);
      reservedOutput += file.size;
    }
  }

  return { files: included, skipped };
}

export function isSensitivePath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const name = normalized.split("/").at(-1)?.toLowerCase() ?? "";
  return (
    /(^|\/)\.env(?:\.|$)/i.test(normalized) ||
    /(^|\/)(?:secrets?|credentials?)(?:\.|\/|$)/i.test(normalized) ||
    /(^|\/)(?:id_rsa|id_ed25519|.*\.(?:pem|key|p12|pfx))$/i.test(normalized) ||
    /(?:token|secret|credential|password|apikey|api_key)/i.test(name)
  );
}

export function isLikelyBinary(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return true;

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return true;
  }

  let controlCharacters = 0;
  for (const byte of bytes) {
    if (byte < 7 || (byte > 13 && byte < 32)) controlCharacters += 1;
  }
  return bytes.length > 0 && controlCharacters / bytes.length > 0.1;
}

export function buildDirectoryTree(paths: string[]): string {
  type TreeNode = { children: Map<string, TreeNode> };
  const root: TreeNode = { children: new Map() };

  for (const path of paths) {
    let current = root;
    for (const part of path.split("/").filter(Boolean)) {
      let child = current.children.get(part);
      if (!child) {
        child = { children: new Map() };
        current.children.set(part, child);
      }
      current = child;
    }
  }

  const lines = ["."];
  const visit = (node: TreeNode, prefix: string) => {
    const entries = [...node.children.entries()].sort(
      ([a, aNode], [b, bNode]) => {
        const aDirectory = aNode.children.size > 0;
        const bDirectory = bNode.children.size > 0;
        return aDirectory === bDirectory
          ? a.localeCompare(b)
          : aDirectory
            ? -1
            : 1;
      },
    );
    entries.forEach(([name, child], index) => {
      const isLast = index === entries.length - 1;
      lines.push(`${prefix}${isLast ? "└── " : "├── "}${name}`);
      visit(child, `${prefix}${isLast ? "    " : "│   "}`);
    });
  };
  visit(root, "");
  return lines.join("\n");
}

export function formatDigest(input: {
  repository: string;
  sourceUrl: string;
  branch: string;
  selectedPath: string;
  files: DigestFile[];
  skipped: SkippedFile[];
  tree?: string;
  warnings?: string[];
}): Omit<RepositoryDigest, "digest"> & { digest: string } {
  const tree =
    input.tree ?? buildDirectoryTree(input.files.map((file) => file.path));
  const characters = input.files.reduce(
    (total, file) => total + file.content.length,
    0,
  );
  const stats = {
    filesIncluded: input.files.length,
    filesSkipped: input.skipped.length,
    characters,
    estimatedTokens: Math.ceil(characters / 4),
  };
  const selectedPath = input.selectedPath || "/";
  const fileBlocks = input.files
    .map((file) => `=== ${file.path} ===\n${file.content}`)
    .join("\n\n");
  const digest = [
    "# Repository Digest",
    `Repository: ${input.repository}`,
    `Source: ${input.sourceUrl}`,
    `Branch: ${input.branch}`,
    `Selected path: ${selectedPath}`,
    "",
    "## Summary",
    `Files included: ${stats.filesIncluded}`,
    `Files skipped: ${stats.filesSkipped}`,
    `Characters: ${stats.characters}`,
    `Estimated tokens: ${stats.estimatedTokens}`,
    "",
    "## Directory tree",
    tree,
    "",
    "## Files",
    fileBlocks || "(No text files matched the selected options.)",
  ].join("\n");

  return {
    repository: input.repository,
    sourceUrl: input.sourceUrl,
    branch: input.branch,
    selectedPath,
    stats,
    tree,
    digest,
    files: input.files.map(({ path, content }) => ({ path, content })),
    skipped: input.skipped,
    warnings: input.warnings ?? [],
  };
}

/** Render a portable Markdown context file for local LLM tools. */
export function formatDigestMarkdown(digest: RepositoryDigest): string {
  const sections = [
    `# Project Digest: ${digest.repository}`,
    "",
    `- Source: ${digest.sourceUrl}`,
    `- Branch: ${digest.branch}`,
    `- Scope: ${digest.selectedPath || "entire repository"}`,
    `- Files included: ${digest.stats.filesIncluded}`,
    `- Files skipped: ${digest.stats.filesSkipped}`,
    `- Estimated tokens: ${digest.stats.estimatedTokens}`,
    "",
    "## Repository structure",
    "",
    "```text",
    digest.tree,
    "```",
    "",
    "## Repository files",
    "",
  ];

  for (const file of digest.files) {
    const longestBacktickRun = Math.max(
      0,
      ...Array.from(file.content.matchAll(/`+/g), ([run]) => run.length),
    );
    const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
    sections.push(
      `### ${file.path}`,
      "",
      `${fence}${markdownCodeLanguage(file.path)}`,
      file.content,
      fence,
      "",
    );
  }

  if (digest.warnings.length > 0) {
    sections.push(
      "## Notes",
      "",
      ...digest.warnings.map((warning) => `- ${warning}`),
      "",
    );
  }

  return sections.join("\n");
}

function markdownCodeLanguage(path: string): string {
  const extension = path.split(".").at(-1)?.toLowerCase() ?? "";
  const aliases: Record<string, string> = {
    cjs: "javascript",
    cts: "typescript",
    h: "c",
    hpp: "cpp",
    js: "javascript",
    jsx: "jsx",
    md: "markdown",
    mjs: "javascript",
    mts: "typescript",
    py: "python",
    sh: "bash",
    ts: "typescript",
    tsx: "tsx",
    yml: "yaml",
  };
  return (
    aliases[extension] ??
    (/^[a-z0-9+#.-]{1,20}$/.test(extension) ? extension : "text")
  );
}

function isGitHubName(value: string): boolean {
  return /^[A-Za-z\d](?:[A-Za-z\d-]{0,37}[A-Za-z\d])?$/.test(value);
}

function isGitHubRepoName(value: string): boolean {
  return (
    /^[A-Za-z\d_.-]{1,100}$/.test(value) && value !== "." && value !== ".."
  );
}

function isSafePathSegment(value: string): boolean {
  return (
    value.length > 0 && value !== "." && value !== ".." && !value.includes("\\")
  );
}

function hasSkippedDirectory(path: string): boolean {
  return path
    .split("/")
    .slice(0, -1)
    .some((part) => SKIPPED_DIRECTORY_NAMES.has(part));
}

function isReadme(path: string): boolean {
  return /^readme(?:\.[^/]+)?$/i.test(path.split("/").at(-1) ?? "");
}

function isBinaryExtension(path: string): boolean {
  const extension = path.split(".").at(-1)?.toLowerCase();
  return !!extension && BINARY_EXTENSIONS.has(extension);
}

function matchesGlob(path: string, pattern: string): boolean {
  const normalized = pattern.trim().replace(/^\/+/, "");
  if (!normalized) return false;
  return globToRegExp(normalized).test(path);
}

function globToRegExp(pattern: string): RegExp {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        while (pattern[index + 1] === "*") index += 1;
        if (pattern[index + 1] === "/") {
          expression += "(?:.*/)?";
          index += 1;
        } else {
          expression += ".*";
        }
      } else {
        expression += "[^/]*";
      }
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += (character ?? "").replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`${expression}$`);
}
