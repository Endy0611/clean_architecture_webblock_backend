// PostToolUse (Edit|Write|MultiEdit): keep the four layers pointing one way (.claude/rules/java-layout.md, python-layout.md).
// Tells Claude (does not undo) when an import goes the wrong way or @Transactional is in the wrong layer.
import { readInput, rel, readDisk, warn, ok, stripCode } from "./lib.mjs";

const file = rel(readInput().tool_input?.file_path);
if (!file) ok();
const problems = [];

// ---------------- Java: services/<svc>/src/main/java/org/kshrd/webblock/<name>/<layer>/...
let m = file.match(/^services\/[\w-]+\/src\/main\/java\/org\/kshrd\/webblock\/(\w+)\/(presentation|application|domain|infrastructure|common)\/(.*)\.java$/);
if (m) {
  const [, svc, layer, rest] = m;
  const text = readDisk(file);
  const code = stripCode(text);
  const base = `org.kshrd.webblock.${svc}`;
  const imports = [...text.matchAll(/^import\s+(?:static\s+)?([\w.]+)/gm)].map((x) => x[1]);
  const into = (l) => imports.filter((i) => i.startsWith(`${base}.${l}.`));
  const bad = (what, list) => list.forEach((i) => problems.push(`${what}: ${i}`));

  if (layer === "domain") {
    bad("domain must not import another layer", [...into("presentation"), ...into("application"), ...into("infrastructure")]);
    if (/@Transactional/.test(code)) problems.push("@Transactional belongs in application/<feature>/handler, not in domain");
  }
  if (layer === "common" && rest.startsWith("domain/"))
    bad("common/domain must not import another layer", [...into("presentation"), ...into("application"), ...into("infrastructure")]);
  if (layer === "application") {
    bad("application must not import presentation (move the shared type to application/<feature>/request|response)", into("presentation"));
  }
  if (layer === "presentation") {
    // allowed: CurrentUser from infrastructure/security, queue-name constants from infrastructure/messaging
    bad("presentation must go through a handler, not infrastructure", into("infrastructure").filter((i) => !/\.infrastructure\.(security|messaging)\./.test(i)));
    if (/@Transactional/.test(code)) problems.push("@Transactional belongs in application/<feature>/handler, not in presentation");
    if (/\bextends\s+(Jpa|Crud|PagingAndSorting)Repository\b/.test(code)) problems.push("repositories belong in infrastructure/persistence");
  }
  if (layer === "infrastructure" && /@(RestController|Controller)\b/.test(code)) problems.push("controllers belong in presentation/rest/<feature>");
  if (/@Entity\b/.test(code) && layer !== "domain") problems.push("@Entity classes belong in domain/<feature>/model");
  if (/\bcom\.webblock\b/.test(text)) problems.push("old package com.webblock found; the package is org.kshrd.webblock.<service>");
}

// ---------------- Python: provisioning-service/src/provisioning/core/{domain,application}
m = file.match(/^services\/provisioning-service\/src\/provisioning\/core\/(domain|application)\/.*\.py$/);
if (m) {
  const text = readDisk(file);
  const imp = [...text.matchAll(/^\s*(?:from|import)\s+([\w.]+)/gm)].map((x) => x[1]);
  const pick = (re) => imp.filter((i) => re.test(i));
  if (m[1] === "domain") pick(/^provisioning\.(core\.application|presentation|infrastructure|hosts)\b/).forEach((i) => problems.push(`domain imports nothing of ours except domain: ${i}`));
  if (m[1] === "application") pick(/^provisioning\.(presentation|infrastructure|hosts)\b/).forEach((i) => problems.push(`application imports only domain (define a port instead): ${i}`));
}

if (problems.length)
  warn(`Layer rule broken in ${file}:\n- ${problems.join("\n- ")}\nSee .claude/rules/java-layout.md (Java) or python-layout.md (Python). Fix it now, or tell the user why it must stay.`);
ok();
