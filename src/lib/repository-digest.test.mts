import assert from "node:assert/strict";
import test from "node:test";

import {
  filterRepositoryFiles,
  formatDigest,
  parseGitHubRepositoryUrl,
} from "./repository-digest.ts";

const options = {
  includePatterns: [],
  excludePatterns: [],
  includeReadme: true,
  maxFileSize: 1_000,
  maxTotalSize: 2_000,
};

test("parses canonical repository and tree URLs", () => {
  assert.deepEqual(
    parseGitHubRepositoryUrl("https://github.com/acme/widgets"),
    {
      owner: "acme",
      repo: "widgets",
      treeReferenceSegments: [],
      normalizedRepositoryUrl: "https://github.com/acme/widgets",
    },
  );
  assert.deepEqual(
    parseGitHubRepositoryUrl(
      "https://github.com/acme/widgets/tree/main/src/lib",
    ),
    {
      owner: "acme",
      repo: "widgets",
      treeReferenceSegments: ["main", "src", "lib"],
      normalizedRepositoryUrl: "https://github.com/acme/widgets",
    },
  );
  assert.throws(() =>
    parseGitHubRepositoryUrl("https://example.com/acme/widgets"),
  );
});

test("filters asset, generated, binary, excluded, and README files", () => {
  const result = filterRepositoryFiles(
    [
      { path: "src/app.ts", sha: "1", size: 10 },
      { path: "node_modules/pkg/index.js", sha: "2", size: 10 },
      { path: "assets/logo.svg", sha: "3", size: 10 },
      { path: "README.md", sha: "4", size: 10 },
      { path: "src/private.ts", sha: "5", size: 10 },
    ],
    {
      ...options,
      includeReadme: false,
      excludePatterns: ["**/private.ts"],
    },
  );
  assert.deepEqual(
    result.files.map((file) => file.path),
    ["src/app.ts"],
  );
  assert.equal(result.skipped.length, 4);
  assert.equal(
    result.skipped.find((file) => file.path === "assets/logo.svg")?.reason,
    "generated or dependency directory",
  );
});

test("enforces the configured total limit before reading files", () => {
  const result = filterRepositoryFiles(
    [
      { path: "a.ts", sha: "1", size: 800 },
      { path: "b.ts", sha: "2", size: 800 },
    ],
    { ...options, maxTotalSize: 1_000 },
  );
  assert.deepEqual(
    result.files.map((file) => file.path),
    ["a.ts"],
  );
  assert.equal(result.skipped[0]?.reason, "maximum total output size reached");
});

test("formats structured AI-ready digest blocks", () => {
  const digest = formatDigest({
    repository: "acme/widgets",
    sourceUrl: "https://github.com/acme/widgets/tree/main",
    branch: "main",
    selectedPath: "src",
    files: [
      { path: "src/index.ts", content: "export const answer = 42;", size: 25 },
    ],
    skipped: [
      { path: "dist/app.js", reason: "generated or dependency directory" },
    ],
    tree: ".\n├── src\n│   └── index.ts\n└── static\n    └── logo.svg",
  });
  assert.match(digest.digest, /Repository: acme\/widgets/);
  assert.match(digest.digest, /=== src\/index.ts ===/);
  assert.match(digest.digest, /static\n    └── logo.svg/);
  assert.equal(digest.stats.filesIncluded, 1);
  assert.equal(digest.stats.filesSkipped, 1);
});
