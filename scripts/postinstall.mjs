import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const generatedClientDir = path.join(projectRoot, "generated", "prisma");
const sourceSchemaPath = path.join(projectRoot, "prisma", "schema.prisma");
const generatedSchemaPath = path.join(generatedClientDir, "schema.prisma");
const normalizeSchema = (schema) =>
  schema
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimStart().trimEnd())
    .join("\n")
    .trim();

const hasExistingGeneratedClient =
  existsSync(path.join(generatedClientDir, "index.js")) &&
  existsSync(path.join(generatedClientDir, "query_engine-windows.dll.node"));

const hasMatchingGeneratedSchema =
  existsSync(sourceSchemaPath) &&
  existsSync(generatedSchemaPath) &&
  normalizeSchema(readFileSync(sourceSchemaPath, "utf8")) ===
    normalizeSchema(readFileSync(generatedSchemaPath, "utf8"));

if (
  process.platform === "win32" &&
  hasExistingGeneratedClient &&
  hasMatchingGeneratedSchema
) {
  console.warn(
    "\nPrisma generate failed, but a matching generated client already exists.",
  );
  console.warn(
    "On Windows, this is commonly caused by `bun run dev` or another Node process locking Prisma's query engine.",
  );
  console.warn(
    "Stop the running app and rerun `bun run prisma:generate` if you changed `prisma/schema.prisma`.",
  );
  process.exit(0);
}

console.error(
  "\nPrisma generate did not complete, and this project does not have a safe generated-client fallback.",
);
console.error("Fix the Prisma error above, then rerun `bun run prisma:generate`.");
process.exit(1);
