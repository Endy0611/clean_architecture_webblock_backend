// PreToolUse (Bash): look inside `git commit` before it happens.
// Blocks: secret/credential files, build output, IDE/venv folders, very large files, secret-looking content in the staged diff,
// and a contracts/ change without contracts/CATALOG.md. Not a replacement for review; a last safety net.
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import { readInput, block, ok, projectDir } from "./lib.mjs";

const cmd = (readInput().tool_input?.command || "").replace(/\s+/g, " ");
if (!/\bgit (?:-C \S+ )?commit\b/.test(cmd)) ok();

const git = (...a) => { try { return execFileSync("git", a, { cwd: projectDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch { return ""; } };
// `git commit -a` stages tracked changes too
const files = new Set(git("diff", "--cached", "--name-only", "--diff-filter=ACMR").split("\n").filter(Boolean));
if (/\bcommit\b[^|;&]*\s-[a-zA-Z]*a/.test(cmd) || /--all\b/.test(cmd))
  git("diff", "--name-only", "--diff-filter=ACMR").split("\n").filter(Boolean).forEach((f) => files.add(f));

const bad = [];
for (const f of files) {
  const b = path.posix.basename(f);
  if (/^\.env(\..*)?$/.test(b) && !/\.(example|sample|template)$/.test(b)) bad.push(`${f}: environment file with secrets`);
  else if (/\.(pem|key|p12|jks|keystore|pfx)$/.test(b) || /(^|\/)secrets?\//.test(f)) bad.push(`${f}: key/secret file`);
  else if (/^realm-export.*\.json$|credentials?.*\.(json|ya?ml)$|^service-account.*\.json$/i.test(b)) bad.push(`${f}: credentials file`);
  else if (/(^|\/)(build|\.gradle|\.venv|venv|node_modules|__pycache__|\.idea|\.vscode|\.next|out|dist)\//.test(f) && !/\/src\/(main|test)\//.test(f)) bad.push(`${f}: build output / IDE / environment folder`);
  else if (/\.(iml|class|jar|war|pyc|log)$/.test(b) && b !== "gradle-wrapper.jar") bad.push(`${f}: generated file`);
  try { if (statSync(path.join(projectDir, f)).size > 5 * 1024 * 1024) bad.push(`${f}: larger than 5 MB`); } catch {}
}
if ([...files].some((f) => f.startsWith("services/webblock-aicode-service/")))
  bad.push("services/webblock-aicode-service/ is its own repository; do not commit it from here");

if (bad.length) block(`Blocked: this commit would include files that must not be committed:\n- ${bad.join("\n- ")}\nUnstage them (git restore --staged <file>) and add them to .gitignore if needed.`);

// contract changes must update the catalog in the same commit
const contractFiles = [...files].filter((f) => /^contracts\/(proto|events)\//.test(f));
if (contractFiles.length && !files.has("contracts/CATALOG.md") && !/CATALOG/.test(cmd))
  block(`Blocked: contracts changed (${contractFiles.slice(0, 3).join(", ")}${contractFiles.length > 3 ? ", ..." : ""}) but contracts/CATALOG.md is not in this commit.\nUpdate the catalog (owner, consumers, status) and stage it. See .claude/rules/contracts.md.`);

// secret-looking content in the staged diff
const diff = git("diff", "--cached", "-U0", "--no-color");
const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\bAKIA[0-9A-Z]{16}\b/, /\bghp_[A-Za-z0-9]{36,}\b/, /\bglpat-[\w-]{20,}\b/, /\bsk-[A-Za-z0-9]{32,}\b/, /\beyJ[\w-]{15,}\.eyJ[\w-]{15,}\.[\w-]{10,}\b/];
for (const re of patterns) if (re.test(added)) block("Blocked: the staged changes contain something that looks like a secret or token. Remove it (use an env var placeholder), then commit again.");
ok();
