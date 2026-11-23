import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export const aiSummariseCommit = async (diff: string): Promise<string> => {
  const response = await model.generateContent([
    `You are an expert programmer, and you are trying to summarize a git diff.

Reminders about the git diff format:

For every file, there are a few metadata lines, like:
diff --git a/lib/index.js b/lib/index.js
index aadf691..bfef603 100644
--- a/lib/index.js
+++ b/lib/index.js

This means that lib/index.js was modified in this commit.
A line starting with + means it was added.
A line starting with - means it was deleted.
Lines without either prefix are context lines and are included only to help understand the changes.

Example summary comments:
* Raised the amount of returned recordings from 10 to 100 [packages/server/recordings_api.ts]
* Fixed a typo in the GitHub Action name [.github/workflows/gpt-commit-summarizer.yml]
* Moved the Octokit initialization to a separate file [src/octokit.ts], [src/index.ts]
* Added an API for completions [packages/utils/apis/openai.ts]
* Lowered numeric tolerance for test files

Guidelines:
- Summarize the actual changes introduced by the diff.
- Use concise, action-oriented comments.
- Include file paths in square brackets when relevant.
- Use one comment per distinct change.
- If a change affects multiple files, include their paths when appropriate.
- If more than two files are relevant to a comment, you may omit the file paths.
- Do not describe unchanged context lines.
- Do not copy the examples into your summary.
- Do not invent changes that are not present in the diff.
- Return only the summary comments, without introductory text or markdown code fences.

Please summarize the following git diff:\n ${diff}`,
  ]);

  return response.response.text();
};
