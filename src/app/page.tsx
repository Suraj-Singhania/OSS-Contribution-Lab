import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Code2,
  Download,
  Eye,
  GitBranch,
  GitPullRequest,
  Layers3,
  MessageSquareText,
  Shield,
  Workflow,
} from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

const painPoints = [
  [
    "A big repo, no starting point",
    "You open the file tree and see hundreds of files. Which ones explain the architecture, and where could your first change fit?",
  ],
  [
    "Context gets lost in the paste",
    "Code copied into a chat loses its file structure. Large projects also run into context limits before you get to the useful question.",
  ],
  [
    "The contribution trail is scattered",
    "Issues, pull requests, and recent commits live across separate GitHub pages. Keeping up takes more tab switching than coding.",
  ],
];

const steps = [
  [
    "01",
    "Create a project",
    "Add a public GitHub repository URL. Keep the repositories you are learning in one project workspace.",
  ],
  [
    "02",
    "Generate a digest",
    "Build a structured view of the codebase, with a file explorer and code viewer to help you get oriented.",
  ],
  [
    "03",
    "Ask questions",
    "Ask about the repo, choose the context to include, and preview the Markdown sent with your question.",
  ],
  [
    "04",
    "Track issues & PRs",
    "Review open issues, open pull requests, and recent commits together as you decide what to work on.",
  ],
];

const features = [
  {
    icon: Workflow,
    title: "See how the repository is put together",
    body: "Get an IDE-style view of a project instead of a wall of source files. Browse the file tree, open code in the viewer, and use file options to shape what goes into the digest.",
    detail:
      "What you’ll see: a navigable file tree, tabbed code viewer, and controls for digest content.",
    visual:
      "Screenshot: project structure view with a selected source file and digest file options open.",
  },
  {
    icon: MessageSquareText,
    title: "Ask questions with the code in view",
    body: "Ask natural-language questions about the linked repository. Start with the entire codebase, narrow the context to selected files or folders, and inspect the Markdown before sending.",
    detail:
      "What you’ll see: a context selector, Add Context controls, Preview Markdown, and saved questions with dated, expandable answers.",
    visual:
      "Screenshot: Ask LLM view showing selected context and a saved question with its answer expanded.",
  },
  {
    icon: GitPullRequest,
    title: "Find a useful place to join in",
    body: "Check open issues and pull requests alongside recent commits, including their authors and dates. Search for an issue or PR by number, then refresh to sync activity from GitHub.",
    detail:
      "What you’ll see: open issue and PR lists, recent commits, number search, and Refresh.",
    visual:
      "Screenshot: project activity dashboard with issues, pull requests, and recent commits in view.",
  },
  {
    icon: Download,
    title: "Take the digest to your local tools",
    body: "Download the repository digest as a Markdown file. Use it with a local LLM when you want to keep questions on your machine, or when a cloud model cannot fit the full context.",
    detail:
      "What you’ll see: a Download Markdown action for the generated digest.",
    visual:
      "Screenshot: digest view with the Markdown download action highlighted.",
  },
];

const audiences = [
  [
    "New to a codebase",
    "Map an inherited or unfamiliar project before you make your first change.",
  ],
  [
    "First-time contributors",
    "Connect repo structure and current activity to find a manageable way to participate.",
  ],
  [
    "Students and self-learners",
    "Learn from real projects and build experience you can carry into a contribution portfolio.",
  ],
  [
    "Maintainers",
    "Give new contributors a shared starting point for understanding your public repository.",
  ],
  [
    "Local-LLM users",
    "Download the digest and bring repository context to a model running in your own setup.",
  ],
];

const faqs = [
  [
    "Which repositories can I add?",
    "You can add public GitHub repositories by pasting the repository URL when you create a project.",
  ],
  [
    "Can I use a private repository?",
    "No. OSS Contribution Lab currently supports public GitHub repositories only.",
  ],
  ["Which LLM powers Ask LLM?", "Ask LLM is powered by gemini-3.5-flash-lite."],
  [
    "How much does it cost?",
    "OSS Contribution Lab is currently available on the free tier.",
  ],
  [
    "Can I use a local LLM?",
    "Yes. Download the repository digest as a Markdown file and load it into your local LLM. Ask LLM in the app uses gemini-3.5-flash-lite.",
  ],
  [
    "What data is stored or sent?",
    "The generated repository digest in Markdown is sent to gemini-3.5-flash-lite when you ask a question. The app's data storage and retention details have not been published. Use Preview Markdown to inspect the context before sending.",
  ],
  [
    "Are there repository size limits?",
    "Repositories up to 100 MB are supported. Use file options to control which files go into the digest.",
  ],
  [
    "How fresh is the GitHub activity?",
    "Refresh the project activity view to sync issues, pull requests, and commits with GitHub. Activity updates when you refresh.",
  ],
];

function CTA({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${dark ? "bg-white text-[#171717] hover:bg-[#e8e8e8]" : "bg-[#20221d] text-white hover:bg-[#383a34]"}`}
          >
            Create your first project <ArrowRight className="size-4" />
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/create"
          className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${dark ? "bg-white text-[#171717] hover:bg-[#e8e8e8]" : "bg-[#20221d] text-white hover:bg-[#383a34]"}`}
        >
          Add a repository <ArrowRight className="size-4" />
        </Link>
      </Show>
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#171815]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="OSS Contribution Lab home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="size-9 object-contain"
          />
          <span className="text-sm font-semibold tracking-tight sm:scale-y-150 sm:text-lg">
            OSS Contribution Lab
          </span>
        </Link>
        <nav
          className="hidden items-center gap-7 text-sm text-[#65675f] md:flex"
          aria-label="Main navigation"
        >
          <a href="#how-it-works" className="text-base hover:text-[#171815]">
            How it works
          </a>
          <a href="#features" className="text-base hover:text-[#171815]">
            Features
          </a>
          <a href="#for-developers" className="text-base hover:text-[#171815]">
            Audiences
          </a>
          <a href="#faq" className="text-base hover:text-[#171815]">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="hidden rounded-full px-4 py-2 text-sm font-medium hover:bg-black/5 sm:inline-flex">
                Sign in
              </button>
            </SignInButton>
            <CTA />
          </Show>
          <Show when="signed-in">
            <Link
              href="/repo-str"
              className="rounded-full bg-[#20221d] px-4 py-2.5 text-sm font-medium text-white"
            >
              Open workspace
            </Link>
            <UserButton />
          </Show>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pt-14 pb-20 sm:px-8 sm:pt-20 sm:pb-24 lg:px-12">
        <div className="pointer-events-none absolute -top-8 right-0 -z-0 size-[32rem] rounded-full bg-[#f1f1ee] blur-3xl" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#deded8] bg-white px-3.5 py-2 text-xs font-medium text-[#55574f]">
              <span className="size-2 rounded-full bg-[#292b25]" />A clearer way
              into open source
            </div>
            <h1 className="max-w-2xl text-5xl leading-[1.04] font-semibold tracking-[-0.055em] sm:text-6xl lg:text-[4.35rem]">
              Your codebase,{" "}
              <span className="font-serif font-normal text-[#666861] italic">
                an open book.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#66685f] sm:text-lg sm:leading-8">
              Understand an unfamiliar public GitHub repo, ask questions with
              its code as context, and see where work is happening. Start with a
              structured digest, then choose your next step with more of the
              picture in view.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CTA />
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-[#deded8] bg-white px-5 py-3 text-sm font-medium hover:bg-[#f6f6f3]"
              >
                See how it works <ArrowDown className="size-4" />
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#777970]">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Public GitHub repositories
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Context you can inspect
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Markdown export for local LLMs
              </span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-4 rounded-[2rem] bg-[#efefec] blur-xl" />
            <div className="relative overflow-hidden rounded-2xl border border-[#deded8] bg-white shadow-[0_24px_80px_-36px_rgba(0,0,0,0.24)]">
              <div className="flex items-center justify-between border-b border-[#eeeee9] px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#20221d] text-white">
                    <BookOpen className="size-5" />
                  </div>
                  Repository digest
                </div>
                <span className="rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[10px] font-semibold text-[#55574f]">
                  PUBLIC REPO
                </span>
              </div>
              <div className="border-b border-[#eee] bg-[#fafaf8] px-5 py-4">
                <div className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-[#8b8d83]">
                  GITHUB REPOSITORY
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#e3e3de] bg-white px-3 py-2.5 text-xs text-[#4e4e4a]">
                  <GitBranch className="size-3.5 shrink-0" />
                  <span className="truncate">
                    github.com / example / project
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-[0.82fr_1.18fr]">
                <div className="border-r border-[#eee] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-[#67695f]">
                    <Workflow className="size-3.5" /> Project files
                  </div>
                  <div className="space-y-2 text-[11px] text-[#686a62]">
                    <div className="rounded-md bg-[#f2f2ef] px-2 py-1.5 font-medium text-[#363630]">
                      ▾ src
                    </div>
                    <div className="pl-4">▾ app</div>
                    <div className="pl-7">◇ page.tsx</div>
                    <div className="pl-7">◇ layout.tsx</div>
                    <div className="pl-4">▸ components</div>
                    <div>◇ README.md</div>
                  </div>
                </div>
                <div className="min-w-0 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[#67695f]">
                      <Code2 className="size-3.5" /> src/app/page.tsx
                    </div>
                    <span className="text-[10px] text-[#a0a197]">
                      TypeScript
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#1c1d1a] p-3.5 font-mono text-[10px] leading-[1.9] text-[#e3e3df] sm:text-[11px]">
                    <div>
                      <span className="text-[#d8c9a3]">export default</span>{" "}
                      function Home() &#123;
                    </div>
                    <div className="pl-3">
                      const context ={" "}
                      <span className="text-[#b7c9a3]">"repository"</span>;
                    </div>
                    <div className="pl-3">return (</div>
                    <div className="pl-6 text-[#c5d5ba]">
                      &lt;Project context=&#123;context&#125; /&gt;
                    </div>
                    <div className="pl-3">);</div>
                    <div>&#125;</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#e8e8e4] bg-[#fafaf8] p-2.5 text-[10px] text-[#676767]">
                    <Bot className="size-3.5 shrink-0" />
                    <span>Where does this page get its data?</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-[#eee] bg-[#fafaf8] px-5 py-3 text-[10px] text-[#777]">
                <GitPullRequest className="size-3.5" /> Issues, pull requests,
                and commits in one workspace
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-[#777970]">
              Illustrative product view
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e8e8e3] bg-[#fafaf8] px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#777970] uppercase">
            Start with a public GitHub repository
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#565850]">
            <span className="inline-flex items-center gap-2">
              <GitBranch className="size-4" /> Works with any public GitHub repo
            </span>
            <span className="text-xs text-[#8b8d83]">
              Free tier · up to 100 MB
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#666]">
            THE ONBOARDING GAP
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            The hard part is knowing where to begin.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#696b62]">
            A repository can be open to everyone and still be hard to enter. OSS
            Contribution Lab brings structure, repo-grounded questions, and
            project activity into one workspace.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {painPoints.map(([title, body], i) => (
            <article
              key={title}
              className="rounded-2xl border border-[#e4e4df] bg-white p-6"
            >
              <div className="font-mono text-xs text-[#898b83]">0{i + 1}</div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6c6e65]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-[#e8e8e3] bg-[#fafaf8] px-5 py-20 sm:px-8 sm:py-24 lg:px-12"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#666]">
              HOW IT WORKS
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Four steps from repo link to contribution.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#696b62]">
              Move from learning the shape of a project to finding work you can
              take on.
            </p>
          </div>
          <div className="divide-y divide-[#e5e6dd] border-y border-[#e5e6dd]">
            {steps.map(([n, title, body]) => (
              <div key={n} className="flex gap-5 py-5 sm:gap-8">
                <span className="pt-1 font-mono text-xs text-[#777970]">
                  {n}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#72746b]">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#666]">
            YOUR PROJECT WORKSPACE
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            A clearer view of the code and the work around it.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#696b62]">
            Switch between repositories from Your Projects. Create a project
            when you are exploring something new, or remove one when it is no
            longer part of your workspace.
          </p>
        </div>
        <div className="mt-11 space-y-5">
          {features.map(
            ({ icon: Icon, title, body, detail, visual }, index) => (
              <article
                key={title}
                className={`grid overflow-hidden rounded-2xl border border-[#e4e4df] bg-white md:grid-cols-2 ${index % 2 ? "" : ""}`}
              >
                <div
                  className={`flex min-h-64 items-center justify-center p-8 ${index % 2 ? "md:order-2" : ""} bg-[#f6f6f3]`}
                >
                  <div className="w-full max-w-sm rounded-xl border border-[#e1e1dc] bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#494b44]">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-[#20221d] text-white">
                        <Icon className="size-4" />
                      </span>
                      {index === 0
                        ? "Project structure"
                        : index === 1
                          ? "Ask LLM"
                          : index === 2
                            ? "Project activity"
                            : "Repository digest"}
                    </div>
                    <div className="mt-4 space-y-2">
                      {(index === 0
                        ? [
                            "▾ src",
                            "  ◇ app/page.tsx",
                            "  ◇ components/",
                            "◇ README.md",
                          ]
                        : index === 1
                          ? [
                              "Context: Entire codebase",
                              "Add Context  +",
                              "Preview Markdown  ◉",
                              "Saved questions  ·  3",
                            ]
                          : index === 2
                            ? [
                                "Open issues  ·  Search by number",
                                "Pull requests  ·  Refresh",
                                "Recent commits  ·  Author · Date",
                              ]
                            : [
                                "Digest ready",
                                "Download as Markdown  ↓",
                                "Use with a local LLM",
                              ]
                      ).map((line) => (
                        <div
                          key={line}
                          className="rounded-md bg-[#f7f7f5] px-3 py-2 font-mono text-[10px] text-[#65675f]"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div
                  className={`flex flex-col justify-center p-7 sm:p-9 ${index % 2 ? "md:order-1" : ""}`}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#f0f0ec] text-[#333]">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#6c6e65]">
                    {body}
                  </p>
                  <p className="mt-4 text-xs leading-5 text-[#55574f]">
                    <strong>What you’ll see:</strong>{" "}
                    {detail.replace("What you’ll see: ", "")}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-[#777970] italic">
                    Design note: {visual.replace("Screenshot: ", "")}
                  </p>
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      <section
        id="for-developers"
        className="scroll-mt-8 border-y border-[#e8e8e3] bg-[#fafaf8] px-5 py-20 sm:px-8 sm:py-24 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#666]">
              MADE FOR THE MOMENT BEFORE THE FIRST CHANGE
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              A useful starting point for every contributor.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {audiences.map(([title, body]) => (
              <article
                key={title}
                className="rounded-2xl border border-[#e4e4df] bg-white p-5"
              >
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6c6e65]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#666]">
              BUILT AROUND YOUR CONTEXT
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Keep control of what informs an answer.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#696b62]">
              The useful answer starts with the files and project context behind
              it.
            </p>
          </div>
          <div className="space-y-4">
            {[
              [
                Layers3,
                "Choose the scope",
                "Use the entire codebase as a starting point, then add specific files or folders when a question needs a narrower view.",
              ],
              [
                Eye,
                "Preview before you ask",
                "See the Markdown context that will accompany your question before you send it to the model.",
              ],
              [
                Download,
                "Bring context local",
                "Export the digest as Markdown for a local LLM or when a cloud model has a smaller context window.",
              ],
              [
                Shield,
                "Ground answers in the repo",
                "Ask about the linked project so responses can use the repository context you selected.",
              ],
            ].map(([Icon, title, body]) => {
              const FeatureIcon = Icon as typeof Layers3;
              return (
                <div
                  key={title as string}
                  className="flex gap-4 rounded-xl border border-[#e4e4df] p-5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f0ec]">
                    <FeatureIcon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{title as string}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#6c6e65]">
                      {body as string}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-12">
        <div className="mx-auto max-w-7xl rounded-3xl bg-[#1b1c19] px-7 py-10 text-white sm:px-12 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/60">
            A FIRST CONTRIBUTION, WITH MORE CONTEXT
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            From &ldquo;where do I even start?&rdquo; to your first pull
            request.
          </h2>
          <div className="mt-7 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <p className="max-w-2xl text-sm leading-7 text-white/70">
              You find a public project you want to learn. Create a project and
              generate its digest to see how its files fit together. Ask which
              part handles a behavior you care about, narrow the context to the
              relevant folder, and preview what will be sent. Then check open
              issues and recent pull requests, search for a candidate issue, and
              read the current activity before you begin. Your first
              contribution still takes thought and code; now you have a clearer
              place to start.
            </p>
            <div className="flex flex-col gap-3 text-sm text-white/75">
              <span className="flex items-center gap-2">
                <Check className="size-4" /> Understand the structure
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4" /> Ask with selected context
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4" /> See current project activity
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e8e8e3] bg-[#fafaf8] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#666]">
              PRIVACY &amp; TRUST
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Know what happens to your context.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#696b62]">
              The current workflow starts with public repositories. Inspect the
              Markdown context before sending a question, or download the digest
              to use in a local LLM setup.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-[#e4e4df] bg-white p-5">
              <h3 className="text-sm font-semibold">Repository access</h3>
              <p className="mt-1 text-sm leading-6 text-[#6c6e65]">
                Public GitHub repositories up to 100 MB are supported. Private
                repositories are not currently supported.
              </p>
            </div>
            <div className="rounded-xl border border-[#e4e4df] bg-white p-5">
              <h3 className="text-sm font-semibold">
                Storage and model processing
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#6c6e65]">
                When you ask a question, the generated repository digest in
                Markdown is sent to gemini-3.5-flash-lite. Preview Markdown to
                inspect the context before sending. App data storage and
                retention details have not been published.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-24"
      >
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#666]">
            FAQ
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Good to know before you start.
          </h2>
        </div>
        <div className="mt-10 divide-y divide-[#e5e6dd] border-y border-[#e5e6dd]">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                {question}
                <span className="text-lg text-[#777970] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6c6e65]">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-3xl border border-[#e4e4df] bg-[#f6f6f3] p-7 sm:p-10 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#666]">
              YOUR CODEBASE, AN OPEN BOOK
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              Pick a public repo. Find your way in.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#696b62]">
              Build a project workspace around the code you want to understand
              and contribute to.
            </p>
          </div>
          <CTA />
        </div>
      </section>

      <footer className="border-t border-[#e8e8e3] px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-[#777970] sm:flex-row">
          <Link
            href="/"
            className="flex items-center gap-2 font-medium text-[#42443d]"
          >
            <Image
              src="/logo.png"
              alt=""
              width={24}
              height={24}
              className="size-6 object-contain"
            />{" "}
            OSS Contribution Lab
          </Link>
          <span>More context for the code you care about.</span>
        </div>
      </footer>
    </main>
  );
}
