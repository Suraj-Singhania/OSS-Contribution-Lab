export function renderMarkdownContext(
  files: { path: string; content: string }[],
  tree: string,
  warnings: string[] = [],
) {
  const sections = files.map(({ path, content }) => {
    const extension = path.split(".").at(-1)?.toLowerCase() ?? "";
    const language = languageForExtension(extension);
    const longestFence = Math.max(
      2,
      ...Array.from(content.matchAll(/`+/g), (match) => match[0].length),
    );
    const fence = "`".repeat(longestFence + 1);
    return `## \`${path}\`\n\n${fence}${language}\n${content}\n${fence}`;
  });
  return [
    "# Codebase Context",
    "",
    "## Directory tree",
    "```text",
    tree,
    "```",
    "",
    ...warnings.map((warning) => `> ${warning}`),
    "",
    "## File contents",
    "",
    sections.join("\n\n---\n\n") ||
      "No readable text files matched the selection.",
  ].join("\n");
}

function languageForExtension(extension: string) {
  const languages: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    mjs: "javascript", cjs: "javascript", py: "python", go: "go",
    rs: "rust", java: "java", kt: "kotlin", cs: "csharp", cpp: "cpp",
    c: "c", h: "c", html: "html", css: "css", scss: "scss",
    json: "json", md: "markdown", yml: "yaml", yaml: "yaml",
    toml: "toml", sh: "bash", sql: "sql", xml: "xml",
    graphql: "graphql", prisma: "prisma", vue: "vue", svelte: "svelte",
  };
  return languages[extension] ?? extension.replace(/[^a-z0-9_-]/g, "");
}
