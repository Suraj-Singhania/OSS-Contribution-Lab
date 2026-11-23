# OSS Contribution Lab

## Repository Digest

Repository Digest creates an AI-ready text export from a public GitHub repository or selected branch/path. It uses GitHub's API only: it never clones a repository, executes its code, fetches arbitrary URLs, or returns credentials to the browser.

Open **Repository Digest** in the signed-in app and paste either:

- `https://github.com/owner/repo`
- `https://github.com/owner/repo/tree/branch/path`

Binary files and asset/generated/dependency folders (`assets`, `node_modules`, `.git`, `dist`, `build`, `vendor`, `coverage`, `.next`) are excluded. Use the optional filters, README switch, and size limits to control the output. Download the result as a Markdown project digest to provide repository context to a local LLM when a hosted model's context window is too small. A repository URL exports the whole repository; a `/tree/branch/path` URL exports that selected scope. Exports honor the configured filters and limits, and report when files were skipped.

### Setup

Install dependencies using the package manager represented by `bun.lock`, then create `.env` from `.env.example`.

```sh
bun install
bun dev
```

Required environment variables:

- `DATABASE_URL` — required by the existing application.

Optional environment variables:

- `GITHUB_TOKEN` — a server-side GitHub token for higher API limits. Public repositories work without it, subject to GitHub's anonymous rate limit. Never use a `NEXT_PUBLIC_` name for this token.

### Checks

```sh
bun run test:repository-digest
bun run typecheck
bun run lint
```

### Current boundaries

Version one supports public `github.com` repositories only. Private repositories, GitHub Enterprise hosts, archive downloads, and repository-code execution are deliberately out of scope. GitHub may truncate exceptionally large recursive trees; the UI reports that condition when it occurs.
