// PostToolUse (Edit|Write|MultiEdit): format the changed file if the formatter is installed. Never fails the edit.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { readInput, rel, ok, projectDir } from "./lib.mjs";

const file = rel(readInput().tool_input?.file_path);
if (!file || !existsSync(path.join(projectDir, file))) ok();
const abs = path.join(projectDir, file);
const run = (bin, args, cwd = projectDir) => { try { execFileSync(bin, args, { cwd, stdio: "ignore", timeout: 20000 }); } catch {} };

if (/\.(ts|tsx|js|jsx|mjs|json|css|md)$/.test(file) && !file.startsWith(".claude/")) {
  // nearest package with a local prettier (apps/web, packages/*, templates/site-template, root)
  let dir = path.dirname(abs);
  while (dir.startsWith(projectDir)) {
    const p = path.join(dir, "node_modules", ".bin", "prettier");
    if (existsSync(p)) { run(p, ["--write", abs], dir); break; }
    if (dir === projectDir) break;
    dir = path.dirname(dir);
  }
} else if (file.endsWith(".java")) {
  run("google-java-format", ["--replace", abs]); // skipped silently if not installed
}
ok();
