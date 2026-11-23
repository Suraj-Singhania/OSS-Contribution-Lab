"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import useProject from "@/hooks/use-project";
import {
  AlertCircle,
  CircleDot,
  CodeXml,
  ExternalLink,
  GitCommitHorizontal,
  GitPullRequest,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type RepositoryOverview = {
  issues: { number: number; title: string; url: string; date: string }[];
  pullRequests: { number: number; title: string; url: string; date: string }[];
  commits: {
    hash: string;
    message: string;
    author: string;
    date: string;
    url: string;
  }[];
};

const DashboardPage = () => {
  const { getToken } = useAuth();
  const { project, projectId } = useProject();
  const githubUrl = project?.githubUrl ?? "";
  const [overview, setOverview] = useState<RepositoryOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [issuePrNumber, setIssuePrNumber] = useState("");
  const [summaryTarget, setSummaryTarget] = useState<{
    kind: "issue" | "pull_request";
    number: number;
    title: string;
  } | null>(null);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const normalizedNumber = issuePrNumber.trim().replace(/^#/, "");
  const filteredIssues = (overview?.issues ?? []).filter(
    (issue) => !normalizedNumber || String(issue.number) === normalizedNumber,
  );
  const filteredPullRequests = (overview?.pullRequests ?? []).filter(
    (pullRequest) =>
      !normalizedNumber || String(pullRequest.number) === normalizedNumber,
  );

  useEffect(() => {
    if (!githubUrl) {
      setOverview(null);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setOverview(null);
    setError("");
    const cachedOverview = readCachedOverview(githubUrl);
    if (cachedOverview) {
      setOverview(cachedOverview);
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    fetchRepositoryOverview(githubUrl, controller.signal)
      .then((data) => {
        setOverview(data);
        saveCachedOverview(githubUrl, data);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError")
          return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load repository activity.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [githubUrl]);

  async function refreshOverview() {
    if (!githubUrl) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchRepositoryOverview(githubUrl);
      setOverview(data);
      saveCachedOverview(githubUrl, data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load repository activity.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function summarizeActivity(
    kind: "issue" | "pull_request",
    number: number,
    title: string,
  ) {
    if (!projectId) return;
    setSummaryTarget({ kind, number, title });
    setSummary("");
    setSummaryError("");
    setSummaryLoading(true);
    try {
      const sessionToken = await getToken();
      const response = await fetch("/api/summarize-activity", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken
            ? { Authorization: `Bearer ${sessionToken}` }
            : {}),
        },
        body: JSON.stringify({ projectId, kind, number }),
      });
      const payload = (await response.json()) as {
        summary?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message ?? "Could not summarize this item.");
      if (!payload.summary)
        throw new Error("The AI returned an empty summary.");
      setSummary(payload.summary);
    } catch (requestError) {
      setSummaryError(
        requestError instanceof Error
          ? requestError.message
          : "Could not summarize this item.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* {Github Link} */}
        <div className="bg-primary w-fit rounded-md px-2 py-2">
          <div className="flex items-center">
            <CodeXml className="size-5 text-white" />
            <div className="ml-2">
              <p className="text-sm font-medium text-white">
                {project?.name ?? "This"} project is linked to:{" "}
                {githubUrl ? (
                  <Link
                    href={githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-white/70 hover:underline"
                  >
                    {githubUrl}
                    <ExternalLink className="ml-1 size-4" />
                  </Link>
                ) : (
                  <span className="text-white/80">No GitHub URL linked</span>
                )}
              </p>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={refreshOverview}
          disabled={!githubUrl || loading}
        >
          <RefreshCw
            className={loading ? "size-4 animate-spin" : "size-4"}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>
      {error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-md border p-3 text-sm">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
      {loading && (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Loading repository activity…
        </div>
      )}
      {!githubUrl && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          Link a GitHub repository to see its issues, pull requests, and recent
          commits.
        </p>
      )}
      {overview && !loading && (
        <>
          <div className="relative max-w-xl">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              inputMode="numeric"
              value={issuePrNumber}
              onChange={(event) => setIssuePrNumber(event.target.value)}
              placeholder="Search Issue or PR using their respective numbers (e.g. 123)"
              aria-label="Search issues and pull requests by number"
              className="pl-9"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ActivityCard
              title="Open issues"
              icon={<CircleDot className="size-4" aria-hidden="true" />}
              emptyMessage={
                normalizedNumber
                  ? `No open issue found with number #${normalizedNumber}.`
                  : "No open issues."
              }
            >
              {filteredIssues.map((issue) => (
                <ActivityLink
                  key={issue.number}
                  url={issue.url}
                  title={issue.title}
                  detail={`#${issue.number} · opened ${formatDate(issue.date)}`}
                  summaryLabel={`issue #${issue.number}`}
                  onSummarize={() =>
                    summarizeActivity("issue", issue.number, issue.title)
                  }
                />
              ))}
            </ActivityCard>
            <ActivityCard
              title="Open pull requests"
              icon={<GitPullRequest className="size-4" aria-hidden="true" />}
              emptyMessage={
                normalizedNumber
                  ? `No open pull request found with number #${normalizedNumber}.`
                  : "No open pull requests."
              }
            >
              {filteredPullRequests.map((pullRequest) => (
                <ActivityLink
                  key={pullRequest.number}
                  url={pullRequest.url}
                  title={pullRequest.title}
                  detail={`#${pullRequest.number} · updated ${formatDate(pullRequest.date)}`}
                  summaryLabel={`pull request #${pullRequest.number}`}
                  onSummarize={() =>
                    summarizeActivity(
                      "pull_request",
                      pullRequest.number,
                      pullRequest.title,
                    )
                  }
                />
              ))}
            </ActivityCard>
            <ActivityCard
              title="Recent commits"
              icon={
                <GitCommitHorizontal className="size-4" aria-hidden="true" />
              }
              emptyMessage="No commits found."
              className="lg:col-span-2"
            >
              {overview.commits.map((commit) => (
                <ActivityLink
                  key={commit.hash}
                  url={commit.url}
                  title={commit.message}
                  detail={`${commit.author} · ${formatDate(commit.date)}`}
                />
              ))}
            </ActivityCard>
          </div>
        </>
      )}
      <Dialog
        open={summaryTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSummaryTarget(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>
            {summaryTarget?.kind === "issue" ? "Issue" : "Pull request"} #
            {summaryTarget?.number} summary
          </DialogTitle>
          <DialogDescription>{summaryTarget?.title}</DialogDescription>
          {summaryLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Generating three-point summary...
            </div>
          ) : summaryError ? (
            <p className="text-destructive text-sm" role="alert">
              {summaryError}
            </p>
          ) : summary ? (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
              {summary
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
                .slice(0, 3)
                .map((line, index) => (
                  <li key={index}>
                    {line.replace(/^(?:[-*•]|\d+[.)])\s*/, "")}
                  </li>
                ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function ActivityCard({
  title,
  icon,
  emptyMessage,
  children,
  className,
}: {
  title: string;
  icon: ReactNode;
  emptyMessage: string;
  children: ReactNode;
  className?: string;
}) {
  const hasItems = Children.count(children) > 0;
  return (
    <Card className={`min-w-0 ${className ?? ""} `}>
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[34rem] space-y-1 overflow-y-auto">
        {hasItems ? (
          children
        ) : (
          <p className="text-muted-foreground p-3 text-sm">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityLink({
  url,
  title,
  detail,
  onSummarize,
  summaryLabel,
}: {
  url: string;
  title: string;
  detail: string;
  onSummarize?: () => void;
  summaryLabel?: string;
}) {
  return (
    <div className="hover:bg-muted/70 flex items-center gap-2 rounded-md p-2 transition-colors">
      <Link
        href={url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1"
      >
        <span className="line-clamp-2 text-sm font-medium">{title}</span>
        <span className="text-muted-foreground mt-1 block text-xs">
          {detail}
        </span>
      </Link>
      {onSummarize && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onSummarize}
          aria-label={`Ask AI for a summary of ${summaryLabel ?? title}`}
          title="Summarize with AI"
        >
          <Sparkles className="size-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "unknown date"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

async function fetchRepositoryOverview(
  githubUrl: string,
  signal?: AbortSignal,
): Promise<RepositoryOverview> {
  const response = await fetch(
    `/api/repository-overview?url=${encodeURIComponent(githubUrl)}`,
    signal ? { signal } : {},
  );
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String(payload.message)
        : "Could not load repository activity.";
    throw new Error(message);
  }
  if (!isRepositoryOverview(payload)) {
    throw new Error("The repository activity response was invalid.");
  }
  return payload;
}

function readCachedOverview(githubUrl: string): RepositoryOverview | null {
  try {
    const cached = window.localStorage.getItem(overviewStorageKey(githubUrl));
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached);
    if (isRepositoryOverview(parsed)) return parsed;
    window.localStorage.removeItem(overviewStorageKey(githubUrl));
  } catch {
    // Continue with a network request if local storage is unavailable.
  }
  return null;
}

function saveCachedOverview(githubUrl: string, overview: RepositoryOverview) {
  try {
    window.localStorage.setItem(
      overviewStorageKey(githubUrl),
      JSON.stringify(overview),
    );
  } catch {
    // Activity remains available in memory if local storage is unavailable.
  }
}

function overviewStorageKey(githubUrl: string) {
  return `repository-overview:${githubUrl}`;
}

function isRepositoryOverview(value: unknown): value is RepositoryOverview {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<RepositoryOverview>;
  return (
    Array.isArray(data.issues) &&
    data.issues.every(isOverviewEntry) &&
    Array.isArray(data.pullRequests) &&
    data.pullRequests.every(isOverviewEntry) &&
    Array.isArray(data.commits) &&
    data.commits.every(
      (commit) =>
        typeof commit === "object" &&
        commit !== null &&
        typeof commit.hash === "string" &&
        typeof commit.message === "string" &&
        typeof commit.author === "string" &&
        typeof commit.date === "string" &&
        typeof commit.url === "string",
    )
  );
}

function isOverviewEntry(
  entry: unknown,
): entry is RepositoryOverview["issues"][number] {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "number" in entry &&
    typeof entry.number === "number" &&
    "title" in entry &&
    typeof entry.title === "string" &&
    "url" in entry &&
    typeof entry.url === "string" &&
    "date" in entry &&
    typeof entry.date === "string"
  );
}

export default DashboardPage;
