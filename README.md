# OSS Contribution Lab

OSS Contribution Lab is a web app for understanding and working with public GitHub repositories. Link a repository to a project, review recent activity, ask questions grounded in repository files, and create a downloadable Markdown digest for use with other AI tools.

The application uses the GitHub API to read repository information. It does not clone repositories, run repository code, or expose server credentials to the browser.

## Features

- **Repository projects** — sign in and link a public GitHub repository to a named project. Projects are associated with the signed-in user.
- **Repository activity** — inspect open issues, pull requests, and recent commits for the linked repository.
- **Project Q&A** — ask questions about repository contents. Choose the full repository or selected files and folders as context, preview the context, or supply a Markdown context file. Answers include source file references where available. Questions and answers can be saved in the interface.
- **Repository Digest** — export a repository or a selected branch and path as a Markdown file. Configure README inclusion, file include/exclude patterns, file size limits, and total output limits. The app reports skipped files and handles large or truncated repository listings.
- **Commit summaries** — the application includes code for retrieving recent commits and generating AI summaries of their diffs.

## Technology

- Next.js 15, React 19, and TypeScript
- Clerk authentication
- PostgreSQL and Prisma
- tRPC for typed application procedures
- GitHub REST API through Octokit
- Gemini for AI features; an optional OpenAI-compatible endpoint can provide Q&A embeddings
- Tailwind CSS and shared UI components

## Requirements

- [Bun](https://bun.sh/) (the repository includes `bun.lock`)
- Node.js supported by the installed Next.js version
- PostgreSQL, local or hosted
- A Clerk application for authentication
- AI provider credentials for the AI features you plan to use
- Optional: Docker or Podman to run the local database with the supplied script

## Getting started

1. Clone the repository and install dependencies:

   ```sh
   bun install
   ```

2. Create your local environment file:

   ```sh
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env`.

3. Configure `DATABASE_URL` with a PostgreSQL connection string. The example uses a local database named `oss-contribution-lab`.

4. Configure Clerk credentials for your Clerk application. The current `.env.example` does not list Clerk keys; add the required `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env` according to Clerk's Next.js setup instructions. Keep the secret key private. Configure Clerk's sign-in and sign-up URLs as needed for your instance.

5. Start PostgreSQL. If Docker or Podman is available, the helper script can create and start a local container after `.env` is configured:

   ```sh
   ./start-database.sh
   ```

   The script is a Bash script. On Windows, run it inside WSL with Docker Desktop or Podman Desktop available. Alternatively, use an existing PostgreSQL server and omit this step.

6. Apply the Prisma schema to the database and start the development server:

   ```sh
   bun run db:push
   bun dev
   ```

7. Open [http://localhost:3000](http://localhost:3000), sign in, create a project, and provide its name, public GitHub repository URL, and AI answer key.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL used by Prisma. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes for authenticated use | Clerk publishable key exposed to the browser. Add it to `.env`; it is not currently present in `.env.example`. |
| `CLERK_SECRET_KEY` | Yes for authenticated use | Server-side Clerk secret. Do not commit or expose it to client code. |
| `GITHUB_TOKEN` | No | Server-side GitHub token to increase API rate limits. Public repository features can work without it subject to anonymous rate limits. Never use a `NEXT_PUBLIC_` prefix. |
| `GEMINI_API_KEY` | Feature-dependent | Server-side Gemini key used by commit summaries and as the fallback Gemini embedding configuration for repository Q&A. |
| `QWEN_EMBEDDING_API_KEY` | No | API key for an OpenAI-compatible embeddings service hosting a Qwen3 embedding model. |
| `QWEN_EMBEDDING_BASE_URL` | No | Base URL for the OpenAI-compatible embeddings endpoint. When configured, Q&A uses this endpoint for embeddings. The example defaults to `http://localhost:1234/v1`. |
| `QWEN_EMBEDDING_MODEL` | No | Model identifier sent to the configured embeddings endpoint. |

For Q&A, the project form accepts an AI API key for generating answers. The code uses a configured Qwen endpoint for embeddings when `QWEN_EMBEDDING_BASE_URL` is set; otherwise it uses Gemini embeddings. When using a non-Gemini answer key, configure `GEMINI_API_KEY` for the embedding fallback. Keep all provider credentials private.

The environment schema is maintained in `src/env.js`. Update it when introducing new server-side variables.

## Useful commands

| Command | Description |
| --- | --- |
| `bun dev` | Run the local development server with Next.js Turbo. |
| `bun run build` | Create a production build. |
| `bun start` | Serve the production build. |
| `bun run db:push` | Push the Prisma schema to the configured database. |
| `bun run db:migrate` | Apply existing Prisma migrations in deployment environments. |
| `bun run db:studio` | Open Prisma Studio for inspecting database records. |
| `bun run prisma:generate` | Generate the Prisma client. |
| `bun run typecheck` | Run the TypeScript compiler without emitting files. |
| `bun run lint` | Run the configured Next.js lint command. |
| `bun run format:check` | Check formatting for supported source and Markdown files. |
| `bun run test:repository-digest` | Run the repository digest unit tests with Node's test runner. |

The `db:generate` script runs `prisma migrate dev`; use it when creating and applying migrations during development. For a new local database without migration files, `db:push` applies the schema directly.

## Using Repository Digest

In the signed-in app, open **Repository Digest** and enter either a repository URL or a branch/path URL:

```text
https://github.com/owner/repo
https://github.com/owner/repo/tree/branch/path
```

A repository URL targets the repository's default branch. A `/tree/branch/path` URL scopes the export to the selected branch and path. Set optional include or exclude patterns, choose whether to include a README, adjust limits, generate the digest, and download the Markdown output. You can use the resulting file as repository context in a local LLM or another tool.

The digest reads file contents through GitHub's API. Binary files and common asset, generated, dependency, build, and coverage folders are excluded, including `assets`, `node_modules`, `.git`, `dist`, `build`, `vendor`, `coverage`, and `.next`. Size limits and filters also affect which files are included.

## Project structure

```text
src/
  app/                 Next.js pages, layouts, and API routes
  components/ui/       Shared interface components
  hooks/               Client-side project and refetch hooks
  lib/                 GitHub, AI, context, and digest helpers
  server/              Database access and server-side procedures
  trpc/                tRPC client and query setup
prisma/
  schema.prisma        PostgreSQL data model
public/                Static assets
scripts/               Setup and maintenance scripts
```

## Current scope and limitations

- Repository reading and digest generation support public repositories on `github.com`. Private repositories and GitHub Enterprise hosts are outside the current digest scope.
- The digest uses GitHub's API rather than downloading archives or cloning repositories. GitHub can truncate very large recursive tree responses; the UI reports when that occurs.
- GitHub API rate limits apply. Set `GITHUB_TOKEN` on the server to raise the limit.
- AI answers and summaries depend on valid provider credentials, provider availability, and model limits.
- Repository code is treated as data and is never executed by the digest feature.

## Contributing

Contributions are welcome. Before opening a pull request, describe the problem or improvement, keep changes focused, and include relevant documentation updates. Run the checks that apply to your change, such as type checking, linting, formatting, and the repository digest tests.

## License

No license file is currently included. Add a license before redistributing this project or its code under particular reuse terms.
