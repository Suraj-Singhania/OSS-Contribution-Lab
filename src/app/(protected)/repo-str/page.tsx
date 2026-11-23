"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Download,
  FileCode2,
  Folder,
  FolderTree,
  GitBranch,
  LoaderCircle,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import useProject from "@/hooks/use-project";
import {
  formatDigestMarkdown,
  type RepositoryDigest,
} from "@/lib/repository-digest";

type Stage =
  | "idle"
  | "validating"
  | "reading"
  | "filtering"
  | "generating"
  | "success"
  | "error";

const stages: {
  id: Exclude<Stage, "idle" | "success" | "error">;
  label: string;
}[] = [
  { id: "validating", label: "Validating URL" },
  { id: "reading", label: "Reading repository" },
  { id: "filtering", label: "Filtering files" },
  { id: "generating", label: "Generating structure" },
];

const MAX_FILE_SIZE_KB = 100 * 1_024;
const DIGEST_STORAGE_PREFIX = "repository-digest:";
const DIGEST_DATABASE_NAME = "repository-digests";
const DIGEST_DATABASE_VERSION = 1;
const DIGEST_OBJECT_STORE = "digests";
const DIGEST_SESSION_KEY = "repository-digest-session";
let fallbackDigestSessionId: string | undefined;

export default function RepoStructurePage() {
  const { project } = useProject();
  const [url, setUrl] = useState("");
  const [patternMode, setPatternMode] = useState<"include" | "exclude">(
    "include",
  );
  const [filePatterns, setFilePatterns] = useState("");
  const [includeReadme, setIncludeReadme] = useState(true);
  const [fileSizeSliderValue, setFileSizeSliderValue] = useState(100);
  const [stage, setStage] = useState<Stage>("idle");
  const [digest, setDigest] = useState<RepositoryDigest | null>(null);
  const [error, setError] = useState("");
  const loading = ["validating", "reading", "filtering", "generating"].includes(
    stage,
  );

  useEffect(() => {
    if (project?.githubUrl) {
      setUrl(project.githubUrl);
      setStage("idle");
      setError("");
      let cancelled = false;
      setDigest(null);
      void readStoredDigest(project.githubUrl).then((storedDigest) => {
        if (!cancelled) setDigest(storedDigest);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [project?.githubUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const storageKeyUrl = url;
    setError("");
    setDigest(null);
    await clearStoredDigest(storageKeyUrl);
    setStage("validating");
    const timers = [
      window.setTimeout(() => setStage("reading"), 120),
      window.setTimeout(() => setStage("filtering"), 800),
      window.setTimeout(() => setStage("generating"), 1_600),
    ];
    try {
      const response = await fetch("/api/repository-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          includePatterns:
            patternMode === "include" ? patternsFrom(filePatterns) : [],
          excludePatterns:
            patternMode === "exclude" ? patternsFrom(filePatterns) : [],
          includeReadme,
          maxFileSize: kilobytesToBytes(
            sliderValueToKilobytes(fileSizeSliderValue),
          ),
          maxTotalSize: 2_000_000,
        }),
      });
      const payload = (await response.json()) as RepositoryDigest & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message ?? "Could not generate this digest.");
      setDigest(payload);
      await saveStoredDigest(storageKeyUrl, payload);
      setStage("success");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate this digest.",
      );
      setStage("error");
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <section className="border-border from-card via-card to-muted/60 rounded-2xl border bg-linear-to-br p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="text-primary mb-3 flex items-center gap-2 text-sm font-medium">
              <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              Project Structure
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Your codebase, an open book.{" "}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6 sm:text-base">
              Transform GitHub repositories into structured, readable digests
              for more meaningful conversations with AI.
            </p>
          </div>
          <div className="bg-background/70 text-muted-foreground flex max-w-60 gap-2 rounded-xl border p-3 text-xs leading-5">
            <ShieldCheck
              className="text-primary mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            Public GitHub Repository only
          </div>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="repository-url">GitHub Repository URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <GitBranch
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  id="repository-url"
                  type="url"
                  required
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://github.com/vercel/next.js/tree/canary/packages/next"
                  className="h-11 pl-10"
                  aria-describedby="repository-url-help"
                />
              </div>
              <Button className="h-11 px-5" type="submit" disabled={loading}>
                {loading ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <FileCode2 aria-hidden="true" />
                )}
                {loading ? "Generating…" : "Generate"}
              </Button>
            </div>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                type="button"
                className="text-muted-foreground -ml-2"
              >
                <SlidersHorizontal aria-hidden="true" /> File options
                <ChevronDown
                  className="transition-transform [[data-state=open]_&]:rotate-180"
                  aria-hidden="true"
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="bg-muted/30 flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0">
                    <Select
                      value={patternMode}
                      onValueChange={(value) =>
                        setPatternMode(
                          value === "exclude" ? "exclude" : "include",
                        )
                      }
                    >
                      <SelectTrigger
                        aria-label="Pattern mode"
                        className="h-10 w-28 shrink-0 rounded-r-none border-r-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="include">Include</SelectItem>
                        <SelectItem value="exclude">Exclude</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="file-patterns"
                      value={filePatterns}
                      onChange={(event) => setFilePatterns(event.target.value)}
                      placeholder={
                        patternMode === "include"
                          ? "*.md, src/**"
                          : "**/*.test.ts, docs/**"
                      }
                      className="h-8 rounded-l-none"
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {patternMode === "include"
                      ? "Only matching files are added. Leave blank to include all text files."
                      : "Matching files are skipped. Asset and generated folders are always skipped."}
                  </p>
                </div>

                <div className="min-w-0 flex-1 space-y-2 lg:max-w-sm">
                  <Label id="max-file-size-label" className="justify-between">
                    <span>Include files under</span>
                    <span className="text-foreground tabular-nums">
                      {formatFileSize(
                        sliderValueToKilobytes(fileSizeSliderValue),
                      )}
                    </span>
                  </Label>
                  <Slider
                    aria-labelledby="max-file-size-label"
                    value={[fileSizeSliderValue]}
                    onValueChange={([value]) =>
                      setFileSizeSliderValue(value ?? 0)
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>1 KB</span>
                    <span>100 MB</span>
                  </div>
                </div>

                <div className="bg-background flex h-10 shrink-0 items-center gap-3 rounded-lg border px-3">
                  <Checkbox
                    id="include-readme"
                    checked={includeReadme}
                    onCheckedChange={(checked) =>
                      setIncludeReadme(checked === true)
                    }
                  />
                  <Label htmlFor="include-readme" className="whitespace-nowrap">
                    Include README files
                  </Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </form>
      </section>

      {loading && <Progress stage={stage} />}
      {error && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex gap-3 rounded-xl border p-4 text-sm"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Digest unavailable</p>
            <p className="text-destructive/90 mt-1">{error}</p>
          </div>
        </div>
      )}
      {stage === "idle" && !error && !digest && <EmptyState />}
      {digest && <DigestResult key={digest.digest} digest={digest} />}
    </div>
  );
}

function Progress({ stage }: { stage: Stage }) {
  const current = stages.findIndex((item) => item.id === stage);
  return (
    <Card aria-live="polite">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <LoaderCircle
            className="text-primary size-4 animate-spin"
            aria-hidden="true"
          />
          Preparing your Project Structure
        </div>
        <ol className="grid gap-3 sm:grid-cols-4">
          {stages.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              {index < current ? (
                <CheckCircle2
                  className="text-primary size-4"
                  aria-hidden="true"
                />
              ) : index === current ? (
                <LoaderCircle
                  className="text-primary size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="size-4 rounded-full border"
                  aria-hidden="true"
                />
              )}
              <span
                className={
                  index <= current ? "text-foreground" : "text-muted-foreground"
                }
              >
                {item.label}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="bg-muted/20 border-dashed">
      <CardContent className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
        <span className="bg-background ring-border mb-4 flex size-12 items-center justify-center rounded-2xl shadow-sm ring-1">
          <FolderTree className="size-6 text-slate-900" aria-hidden="true" />
        </span>
        <h2 className="font-medium">Your digest will appear here</h2>
        <p className="text-muted-foreground mt-1 max-w-md text-sm leading-6">
          Paste a public repository link to explore its directory tree and view
          the code in individual files.
        </p>
      </CardContent>
    </Card>
  );
}

function DigestResult({ digest }: { digest: RepositoryDigest }) {
  const fileTree = createFileTree(digest.files);
  const [selectedFilePath, setSelectedFilePath] = useState(
    digest.files[0]?.path ?? "",
  );
  const [openFilePaths, setOpenFilePaths] = useState(
    digest.files[0] ? [digest.files[0].path] : [],
  );
  function openFile(path: string) {
    setSelectedFilePath(path);
    setOpenFilePaths((paths) =>
      paths.includes(path) ? paths : [...paths, path],
    );
  }
  function closeFile(path: string) {
    const closingIndex = openFilePaths.indexOf(path);
    const remainingPaths = openFilePaths.filter(
      (openPath) => openPath !== path,
    );
    setOpenFilePaths(remainingPaths);
    if (selectedFilePath === path) {
      setSelectedFilePath(
        remainingPaths[Math.max(0, closingIndex - 1)] ??
          remainingPaths[0] ??
          "",
      );
    }
  }
  const selectedFile = digest.files.find(
    (file) => file.path === selectedFilePath,
  );
  return (
    <section className="space-y-5" aria-label="Project Structure result">
      {digest.warnings.map((warning) => (
        <div
          key={warning}
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
        >
          {warning}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white bg-white px-4 py-2 text-sm text-black shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
        <div className="mx-2.5 min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Need more context than your cloud model allows?
          </p>
          <p className="text-gray-500">
            Download this digest as Markdown and load it into your local LLM.
            Ask Questions about this project as many as you like.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadDigestMarkdown(digest)}
        >
          <Download aria-hidden="true" /> Download .md
        </Button>
      </div>
      <section className="space-y-3" aria-label="Project structure and code">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FolderTree className="text-primary size-6" aria-hidden="true" />
          Project Structure
        </h2>
        <Card className="min-w-0 overflow-hidden border-slate-200 bg-white p-0 shadow-sm">
          <CardContent className="grid min-h-[40rem] p-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
            <aside className="min-w-0 border-b border-slate-200 bg-white lg:border-r lg:border-b-0">
              <div className="flex h-10 items-center border-b border-slate-200 px-4 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                Explorer
              </div>
              <div className="repo-structure-scroll h-[38rem] overflow-auto p-2">
                {fileTree.length > 0 ? (
                  <FileTree
                    nodes={fileTree}
                    selectedFilePath={selectedFilePath}
                    onSelect={openFile}
                  />
                ) : (
                  <p className="p-2 text-sm text-slate-500">
                    No readable files matched the selected options.
                  </p>
                )}
              </div>
            </aside>
            <div className="min-w-0 bg-white">
              <div
                className="flex h-10 overflow-x-auto border-b border-slate-200 bg-slate-100"
                role="tablist"
                aria-label="Open files"
              >
                {openFilePaths.map((path) => {
                  const file = digest.files.find((item) => item.path === path);
                  if (!file) return null;
                  const isSelected = path === selectedFilePath;
                  return (
                    <div
                      key={path}
                      className={`flex max-w-64 shrink-0 items-center border-r border-slate-200 ${isSelected ? "border-t-2 border-t-black bg-white" : "bg-slate-100"}`}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        className="flex min-w-0 items-center gap-2 py-2 pl-3 font-mono text-xs text-slate-700"
                        onClick={() => setSelectedFilePath(path)}
                        title={path}
                      >
                        <FileCode2
                          className="size-3.5 shrink-0 text-slate-700"
                          aria-hidden="true"
                        />
                        <span className="truncate">{path}</span>
                      </button>
                      <button
                        type="button"
                        className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-slate-500 hover:bg-slate-200 hover:text-black"
                        onClick={() => closeFile(path)}
                        aria-label={`Close ${path}`}
                        title={`Close ${path}`}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="repo-structure-scroll h-[38rem] overflow-auto bg-black text-white">
                <pre className="p-4 font-mono text-xs leading-6 break-words whitespace-pre-wrap sm:text-[13px]">
                  <code>{selectedFile?.content ?? ""}</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </section>
  );
}

function downloadDigestMarkdown(digest: RepositoryDigest) {
  const markdown = formatDigestMarkdown(digest);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = digest.repository.replace(/[^a-zA-Z0-9._-]+/g, "-");
  link.href = objectUrl;
  link.download = `${safeName}-project-digest.md`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

type FileTreeNode = {
  name: string;
  path: string;
  file?: RepositoryDigest["files"][number];
  children: FileTreeNode[];
};

function createFileTree(files: RepositoryDigest["files"]): FileTreeNode[] {
  const root: FileTreeNode = { name: ".", path: "", children: [] };

  for (const file of files) {
    let current = root;
    const parts = file.path.split("/").filter(Boolean);
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/");
      let child = current.children.find((node) => node.name === part);
      if (!child) {
        child = { name: part, path, children: [] };
        current.children.push(child);
      }
      if (index === parts.length - 1) child.file = file;
      current = child;
    });
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      const aIsFile = !!a.file;
      const bIsFile = !!b.file;
      return aIsFile === bIsFile
        ? a.name.localeCompare(b.name)
        : aIsFile
          ? 1
          : -1;
    });
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(root.children);
  return root.children;
}

function FileTree({
  nodes,
  selectedFilePath,
  onSelect,
  depth = 0,
}: {
  nodes: FileTreeNode[];
  selectedFilePath: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.file ? (
            <button
              type="button"
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 ${selectedFilePath === node.path ? "bg-slate-200 font-medium text-black" : "text-slate-700"}`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              aria-pressed={selectedFilePath === node.path}
              onClick={() => onSelect(node.path)}
            >
              <FileCode2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{node.name}</span>
            </button>
          ) : (
            <>
              <div
                className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-700"
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
              >
                <Folder
                  className="size-3.5 shrink-0 text-slate-600"
                  aria-hidden="true"
                />
                <span className="truncate">{node.name}</span>
              </div>
              <FileTree
                nodes={node.children}
                selectedFilePath={selectedFilePath}
                onSelect={onSelect}
                depth={depth + 1}
              />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function patternsFrom(value: string) {
  return value
    .split(/[\n,]/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

function sliderValueToKilobytes(value: number) {
  return Math.round(2 ** (Math.log2(MAX_FILE_SIZE_KB) * (value / 100)));
}

function kilobytesToBytes(value: number) {
  return value * 1_024;
}

function formatFileSize(kilobytes: number) {
  if (kilobytes < 1_024) return `${kilobytes} KB`;
  const megabytes = kilobytes / 1_024;
  return `${Number(megabytes.toFixed(megabytes < 10 ? 1 : 0))} MB`;
}

function isRepositoryDigest(value: unknown): value is RepositoryDigest {
  if (typeof value !== "object" || value === null) return false;
  const digest = value as Partial<RepositoryDigest>;
  return (
    typeof digest.repository === "string" &&
    typeof digest.sourceUrl === "string" &&
    typeof digest.branch === "string" &&
    typeof digest.selectedPath === "string" &&
    typeof digest.stats === "object" &&
    digest.stats !== null &&
    Array.isArray(digest.files) &&
    Array.isArray(digest.warnings)
  );
}

function digestStorageKey(repositoryUrl: string) {
  try {
    const parsedUrl = new URL(repositoryUrl);
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname.toLowerCase() !== "github.com"
    ) {
      return null;
    }
    const [owner, repo] = parsedUrl.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2);
    if (!owner || !repo) return null;
    return `${DIGEST_STORAGE_PREFIX}${owner.toLowerCase()}/${repo.replace(/\.git$/i, "").toLowerCase()}`;
  } catch {
    return null;
  }
}

type StoredDigest = {
  key: string;
  digest: RepositoryDigest;
};

async function readStoredDigest(
  repositoryUrl: string,
): Promise<RepositoryDigest | null> {
  try {
    const key = makeSessionDigestKey(repositoryUrl);
    if (!key) return null;
    const database = await openDigestDatabase();
    const transaction = database.transaction(DIGEST_OBJECT_STORE, "readonly");
    const record = await requestResult<StoredDigest | undefined>(
      transaction.objectStore(DIGEST_OBJECT_STORE).get(key),
    );
    database.close();
    return record && isRepositoryDigest(record.digest) ? record.digest : null;
  } catch {
    // IndexedDB can be unavailable or over quota in restricted browser contexts.
    return null;
  }
}

async function saveStoredDigest(
  repositoryUrl: string,
  digest: RepositoryDigest,
) {
  try {
    const key = makeSessionDigestKey(repositoryUrl);
    if (!key) return;
    const database = await openDigestDatabase();
    const transaction = database.transaction(DIGEST_OBJECT_STORE, "readwrite");
    transaction
      .objectStore(DIGEST_OBJECT_STORE)
      .put({ key, digest } satisfies StoredDigest);
    await transactionComplete(transaction);
    database.close();
  } catch {
    // Keep the generated digest available in memory if IndexedDB cannot save it.
  }
}

async function clearStoredDigest(repositoryUrl: string) {
  try {
    const key = makeSessionDigestKey(repositoryUrl);
    if (!key) return;
    const database = await openDigestDatabase();
    const transaction = database.transaction(DIGEST_OBJECT_STORE, "readwrite");
    transaction.objectStore(DIGEST_OBJECT_STORE).delete(key);
    await transactionComplete(transaction);
    database.close();
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function makeSessionDigestKey(repositoryUrl: string) {
  const repositoryKey = digestStorageKey(repositoryUrl);
  return repositoryKey ? `${getDigestSessionId()}:${repositoryKey}` : null;
}

function getDigestSessionId() {
  if (fallbackDigestSessionId) return fallbackDigestSessionId;
  try {
    const storedId = window.sessionStorage.getItem(DIGEST_SESSION_KEY);
    if (storedId) return (fallbackDigestSessionId = storedId);
    const newId = window.crypto.randomUUID();
    window.sessionStorage.setItem(DIGEST_SESSION_KEY, newId);
    return (fallbackDigestSessionId = newId);
  } catch {
    return (fallbackDigestSessionId = window.crypto.randomUUID());
  }
}

function openDigestDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(
      DIGEST_DATABASE_NAME,
      DIGEST_DATABASE_VERSION,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DIGEST_OBJECT_STORE)) {
        database.createObjectStore(DIGEST_OBJECT_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Digest storage is blocked."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
