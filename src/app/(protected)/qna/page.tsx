"use client";

import {
  Fragment,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Bot,
  ChevronDown,
  CircleHelp,
  LoaderCircle,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useProject from "@/hooks/use-project";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type SavedQuestion = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
};

type AnswerResult = {
  question: string;
  answer: string;
  sources: { path: string; content: string; score: number }[];
};
type UploadedMarkdown = { name: string; content: string };

const QAPage = () => {
  const { project, projectId } = useProject();
  const [question, setQuestion] = useState("");
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState("");
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [uploadedContext, setUploadedContext] =
    useState<UploadedMarkdown | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [contextMarkdown, setContextMarkdown] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const selectedFileCount = availableFiles.filter(
    (path) =>
      selectedPaths.includes(path) ||
      selectedPaths.some(
        (folder) => folder.endsWith("/") && path.startsWith(folder),
      ),
  ).length;
  const contextMode = selectedPaths.length > 0 ? "selected" : "entire";

  async function toggleContextPreview() {
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }
    if (!projectId) return;
    if (
      uploadedContext &&
      selectedPaths.length === 0 &&
      contextMode === "selected"
    ) {
      setContextMarkdown(
        `# ${uploadedContext.name}\n\n${uploadedContext.content}`,
      );
      setPreviewOpen(true);
      return;
    }
    setPreviewLoading(true);
    setContextError("");
    try {
      const response = await fetch("/api/context-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          mode: contextMode,
          paths: selectedPaths,
        }),
      });
      const result = (await response.json()) as {
        markdown?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          result.message ?? "Could not generate Markdown context.",
        );
      const uploadMarkdown = uploadedContext
        ? `\n\n---\n\n## Uploaded Markdown: ${uploadedContext.name}\n\n${uploadedContext.content}`
        : "";
      setContextMarkdown(`${result.markdown ?? ""}${uploadMarkdown}`);
      setPreviewOpen(true);
    } catch (previewError) {
      setContextError(
        previewError instanceof Error
          ? previewError.message
          : "Could not generate Markdown context.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function openContextPicker() {
    setContextOpen(true);
    if (availableFiles.length || !projectId || contextLoading) return;
    setContextLoading(true);
    setContextError("");
    try {
      const response = await fetch(
        `/api/context-files?projectId=${encodeURIComponent(projectId)}`,
      );
      const result = (await response.json()) as {
        files?: string[];
        folders?: string[];
        message?: string;
      };
      if (!response.ok)
        throw new Error(result.message ?? "Could not load repository files.");
      setAvailableFiles(result.files ?? []);
      setAvailableFolders(result.folders ?? []);
    } catch (loadError) {
      setContextError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load repository files.",
      );
    } finally {
      setContextLoading(false);
    }
  }

  useEffect(() => {
    setQuestion("");
    setError("");
    setDialogOpen(false);
    setAnswerResult(null);
    setAnswerSaved(false);
    setSaveError("");
    setSelectedPaths([]);
    setUploadedContext(null);
    setContextMarkdown("");
    setAvailableFiles([]);
    setAvailableFolders([]);
    if (!projectId) {
      setSavedQuestions([]);
      return;
    }

    try {
      const saved = window.localStorage.getItem(savedQuestionsKey(projectId));
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      setSavedQuestions(isSavedQuestions(parsed) ? parsed : []);
    } catch {
      setSavedQuestions([]);
    }
  }, [projectId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentQuestion = question.trim();
    if (!projectId || !currentQuestion || loading) return;
    if (
      contextMode === "selected" &&
      selectedPaths.length === 0 &&
      !uploadedContext
    ) {
      setError(
        "Select at least one repository file or upload a Markdown file.",
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ask-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          question: currentQuestion,
          contextMode,
          selectedPaths,
          uploadedContext,
        }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        sources?: AnswerResult["sources"];
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Could not answer this question.");
      }
      if (!payload.answer || !Array.isArray(payload.sources)) {
        throw new Error("The AI response was incomplete. Please try again.");
      }
      setAnswerResult({
        question: currentQuestion,
        answer: payload.answer,
        sources: payload.sources,
      });
      setSelectedSourceIndex(0);
      setAnswerSaved(false);
      setSaveError("");
      setDialogOpen(true);
      setQuestion("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not answer this question.",
      );
    } finally {
      setLoading(false);
    }
  }

  function saveAnswer() {
    if (!projectId || !answerResult || answerSaved) return;
    const entry: SavedQuestion = {
      id: window.crypto.randomUUID(),
      question: answerResult.question,
      answer: answerResult.answer,
      createdAt: new Date().toISOString(),
    };
    const updatedQuestions = [entry, ...savedQuestions].slice(0, 50);
    try {
      window.localStorage.setItem(
        savedQuestionsKey(projectId),
        JSON.stringify(updatedQuestions),
      );
      setSavedQuestions(updatedQuestions);
      setAnswerSaved(true);
    } catch {
      setSaveError("The answer could not be saved in this browser.");
    }
  }

  function deleteSavedQuestion(questionId: string) {
    if (!projectId) return;
    const updatedQuestions = savedQuestions.filter(
      (savedQuestion) => savedQuestion.id !== questionId,
    );
    try {
      window.localStorage.setItem(
        savedQuestionsKey(projectId),
        JSON.stringify(updatedQuestions),
      );
      setSavedQuestions(updatedQuestions);
    } catch {
      setError("The saved question could not be deleted in this browser.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="text-primary size-5" aria-hidden="true" />
            Ask LLM
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {project
              ? `Ask a question about ${project.name}. The answer uses its linked repository.`
              : "Select a project to ask questions about its linked repository."}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-2" onSubmit={handleSubmit}>
            <div className="rounded-lg border px-2 py-1.5">
              <div className="flex flex-wrap items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Context: </span>
                  <span className="text-muted-foreground">
                    {contextMode === "entire"
                      ? "Entire codebase"
                      : `Selected files · ${selectedFileCount}`}
                    {uploadedContext
                      ? ` + Markdown · ${uploadedContext.name}`
                      : ""}
                    {contextMarkdown
                      ? ` · ${contextMarkdown.length.toLocaleString()} characters`
                      : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  {(selectedPaths.length > 0 || uploadedContext) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPaths([]);
                        setUploadedContext(null);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openContextPicker}
                  >
                    Add Context
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleContextPreview}
                    disabled={
                      previewLoading ||
                      (!selectedPaths.length &&
                        !uploadedContext &&
                        contextMode === "selected")
                    }
                  >
                    {previewLoading
                      ? "Generating…"
                      : previewOpen
                        ? "Hide preview"
                        : "Preview Markdown"}
                  </Button>
                </div>
              </div>
              {previewOpen && (
                <pre className="bg-muted mt-3 max-h-80 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                  {contextMarkdown}
                </pre>
              )}
            </div>
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={
                project
                  ? `Ask something about ${project.name}…`
                  : "Select a project first"
              }
              maxLength={2_000}
              rows={4}
              className="min-h-25 text-base"
              disabled={!project || loading}
              aria-label="Ask a question about this project"
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              disabled={!project || !question.trim() || loading}
            >
              {loading ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Bot aria-hidden="true" />
              )}
              {loading ? "Thinking…" : "Ask LLM"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {contextOpen && (
        <div
          className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setContextOpen(false);
          }}
        >
          <section
            className="bg-background w-full max-w-2xl space-y-4 rounded-xl border p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Add codebase context"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Context</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setContextOpen(false)}
                aria-label="Close"
              >
                <X />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-3 py-2 text-sm font-medium">
                Select files
              </span>
              <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">
                Upload Markdown
                <input
                  className="sr-only"
                  type="file"
                  accept=".md,text/markdown,text/plain"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (
                      !file.name.toLowerCase().endsWith(".md") ||
                      file.size > 80_000
                    ) {
                      setContextError("Choose a .md file up to 80 KB.");
                      return;
                    }
                    setUploadedContext({
                      name: file.name,
                      content: await file.text(),
                    });
                    setContextError("");
                  }}
                />
              </label>
            </div>
            {uploadedContext && (
              <p className="text-muted-foreground text-sm">
                Uploaded: {uploadedContext.name} (
                {uploadedContext.content.length.toLocaleString()} characters){" "}
                <button
                  className="text-destructive underline"
                  type="button"
                  onClick={() => setUploadedContext(null)}
                >
                  Remove
                </button>
              </p>
            )}
            {contextError && (
              <p className="text-destructive text-sm" role="alert">
                {contextError}
              </p>
            )}
            {contextLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                <LoaderCircle className="mr-2 inline size-4 animate-spin" />
                Loading repository files…
              </p>
            ) : (
              <div className="max-h-[45vh] space-y-2 overflow-auto rounded-md border p-3">
                {availableFiles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No repository files available.
                  </p>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xs">
                      Choose individual files or a folder. Sensitive and ignored
                      files are filtered on the server.
                    </p>
                    {availableFolders.map((folder) => (
                      <label
                        key={folder}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPaths.includes(`${folder}/`)}
                          onChange={(event) =>
                            setSelectedPaths((paths) =>
                              event.target.checked
                                ? [
                                    ...paths.filter(
                                      (path) =>
                                        !path.startsWith(`${folder}/`) &&
                                        path !== `${folder}/`,
                                    ),
                                    `${folder}/`,
                                  ]
                                : paths.filter((path) => path !== `${folder}/`),
                            )
                          }
                        />
                        📁 {folder}/
                      </label>
                    ))}
                    {availableFiles.map((path) => (
                      <label
                        key={path}
                        className="ml-5 flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={
                            selectedPaths.includes(path) ||
                            selectedPaths.some(
                              (folder) =>
                                folder.endsWith("/") && path.startsWith(folder),
                            )
                          }
                          onChange={(event) =>
                            setSelectedPaths((paths) =>
                              event.target.checked
                                ? [...paths, path]
                                : paths.filter((item) => item !== path),
                            )
                          }
                        />
                        {path}
                      </label>
                    ))}
                  </>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground self-center text-xs">
                {selectedPaths.length} selected ·{" "}
                {uploadedContext
                  ? `${uploadedContext.content.length.toLocaleString()} characters`
                  : "Repository files are retrieved by relevance"}
              </span>
              <Button type="button" onClick={() => setContextOpen(false)}>
                Done
              </Button>
            </div>
          </section>
        </div>
      )}

      <section className="space-y-3" aria-label="Saved questions">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Saved Questions
          </h2>
          {project && (
            <span className="text-muted-foreground text-sm">
              {project.name}
            </span>
          )}
        </div>
        {!project && (
          <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Select a project to view its saved questions.
          </div>
        )}
        {project && savedQuestions.length === 0 && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm">
            <CircleHelp className="size-4" aria-hidden="true" />
            Questions you ask about this project will appear here.
          </div>
        )}
        {project &&
          savedQuestions.map((savedQuestion) => (
            <Card key={savedQuestion.id}>
              <CardContent className="flex items-start gap-2 p-0">
                <details className="group min-w-0 flex-1">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                    <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                      <Bot className="text-primary size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-semibold">
                          {savedQuestion.question}
                        </span>
                        <time
                          className="text-muted-foreground text-xs"
                          dateTime={savedQuestion.createdAt}
                        >
                          {formatDate(savedQuestion.createdAt)}
                        </time>
                      </span>
                    </span>
                    <ChevronDown
                      className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="border-t px-4 py-4 text-sm leading-6 text-black">
                    <AnswerMarkdown content={savedQuestion.answer} />
                  </div>
                </details>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive mt-2 mr-2 shrink-0"
                  aria-label={`Delete saved question: ${savedQuestion.question}`}
                  title="Delete saved question"
                  onClick={() => deleteSavedQuestion(savedQuestion.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex h-[92vh] w-[96vw] flex-col gap-3 overflow-hidden p-5 sm:rounded-xl md:w-[90vw] md:max-w-4xl xl:max-w-7xl">
          <DialogTitle className="sr-only">
            Answer and repository sources
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review the answer, explore the source files, and save this answer to
            the selected project.
          </DialogDescription>
          {answerResult && (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 pr-8">
                <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                  <Sparkles className="size-6" aria-hidden="true" />
                </span>
                <Button
                  type="button"
                  variant={answerSaved ? "secondary" : "outline"}
                  onClick={saveAnswer}
                  disabled={answerSaved}
                >
                  {answerSaved ? "Answer Saved" : "Save Answer"}
                </Button>
              </div>
              {saveError && (
                <p className="text-destructive shrink-0 text-sm" role="alert">
                  {saveError}
                </p>
              )}
              <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                <div className="min-h-0 overflow-y-auto rounded-lg border border-slate-200 px-5 py-4">
                  <p className="text-muted-foreground mb-3 text-sm">
                    {answerResult.question}
                  </p>
                  <AnswerMarkdown content={answerResult.answer} />
                </div>
                <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200">
                  <div
                    className="repo-structure-scroll flex shrink-0 gap-1 overflow-x-auto bg-slate-100 p-1.5"
                    role="tablist"
                    aria-label="Relevant repository files"
                  >
                    {answerResult.sources.map((source, index) => (
                      <button
                        key={`${source.path}-${index}`}
                        type="button"
                        role="tab"
                        aria-selected={selectedSourceIndex === index}
                        onClick={() => setSelectedSourceIndex(index)}
                        title={source.path}
                        className={`max-w-64 shrink-0 truncate rounded-md px-3 py-2 text-sm font-medium transition-colors ${selectedSourceIndex === index ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-white"}`}
                      >
                        {source.path}
                      </button>
                    ))}
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto bg-[#263746] text-slate-100">
                    {answerResult.sources[selectedSourceIndex] ? (
                      <pre className="p-5 font-mono text-sm leading-7 whitespace-pre-wrap">
                        <code>
                          {answerResult.sources[selectedSourceIndex].content}
                        </code>
                      </pre>
                    ) : (
                      <p className="p-5 text-sm text-slate-300">
                        No source file was matched for this answer.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DialogClose asChild>
                <Button type="button" className="w-full shrink-0">
                  Close
                </Button>
              </DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function AnswerMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index] ?? "")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre
          key={`code-${blocks.length}`}
          className="my-3 overflow-x-auto rounded-md bg-[#1e1e1e] p-4 font-mono text-sm leading-6 text-slate-100"
        >
          <code className={fence[1] ? `language-${fence[1]}` : undefined}>
            {codeLines.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const level = line.match(/^#+/)?.[0].length ?? 2;
      const Heading = `h${Math.min(level, 4)}` as "h1" | "h2" | "h3" | "h4";
      blocks.push(
        <Heading
          key={`heading-${blocks.length}`}
          className="my-2 font-semibold"
        >
          {renderInlineMarkdown(heading[1] ?? "")}
        </Heading>,
      );
      index += 1;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const item = (lines[index] ?? "").match(
          /^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+)$/,
        );
        if (!item) break;
        items.push(
          <li key={items.length}>{renderInlineMarkdown(item[1] ?? "")}</li>,
        );
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List
          key={`list-${blocks.length}`}
          className={`my-2 space-y-1 pl-6 ${ordered ? "list-decimal" : "list-disc"}`}
        >
          {items}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim()) {
      if (
        /^\s*```|^#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+[.)]\s+/.test(
          lines[index] ?? "",
        )
      )
        break;
      paragraph.push(lines[index] ?? "");
      index += 1;
    }
    if (paragraph.length === 0) {
      index += 1;
      continue;
    }
    blocks.push(
      <p key={`paragraph-${blocks.length}`} className="my-2 leading-7">
        {paragraph.map((part, partIndex) => (
          <Fragment key={partIndex}>
            {partIndex > 0 && <br />}
            {renderInlineMarkdown(part)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-[#1e1e1e] px-1.5 py-0.5 font-mono text-[0.9em] text-white"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function savedQuestionsKey(projectId: string) {
  return `saved-project-questions:${projectId}`;
}

function isSavedQuestions(value: unknown): value is SavedQuestion[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "id" in entry &&
        typeof entry.id === "string" &&
        "question" in entry &&
        typeof entry.question === "string" &&
        "answer" in entry &&
        typeof entry.answer === "string" &&
        "createdAt" in entry &&
        typeof entry.createdAt === "string",
    )
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default QAPage;
