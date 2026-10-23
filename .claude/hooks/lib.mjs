// Shared helpers for WebBlock hooks. Node only — no jq needed (works on macOS/Linux/Windows).
import { readFileSync } from "node:fs";
import path from "node:path";

export function readInput() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return {}; }
}
export const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
export function rel(p) {
  if (!p) return "";
  const abs = path.isAbsolute(p) ? p : path.join(projectDir, p);
  return path.relative(projectDir, abs).split(path.sep).join("/");
}
/** Block the tool call: exit 2, reason on stderr goes back to Claude. */
export function block(reason) { process.stderr.write(reason + "\n"); process.exit(2); }
export function ok() { process.exit(0); }
