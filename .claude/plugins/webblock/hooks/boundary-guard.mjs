// PostToolUse (Edit|Write|MultiEdit): keep services independent (microservice-boundaries.md, hard rule 1).
// Tells Claude (does not undo) about: importing another service's classes, hard-coded host:port, @FeignClient(url=...),
// reading another service's tables, and a build.gradle that depends on another service or versions a Boot/Cloud artifact.
import { readInput, rel, readDisk, warn, ok, stripCode } from "./lib.mjs";

const file = rel(readInput().tool_input?.file_path);
if (!file) ok();
const problems = [];
const own = file.match(/^services\/([\w-]+)\//)?.[1]; // e.g. payment-service
const ownShort = own?.replace(/-service$/, "");
const isTest = /\/src\/test\//.test(file);

if (own && /\.java$/.test(file) && /\/src\/main\//.test(file)) {
  const text = readDisk(file), code = stripCode(text);
  const withStrings = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const [, other] of text.matchAll(/^import\s+(?:static\s+)?org\.kshrd\.webblock\.(\w+)\./gm))
    if (other !== ownShort && other !== "contracts")
      problems.push(`imports classes of another service ("${other}"). Define your own DTO from the contract (contracts/), never share classes.`);
  if (/@FeignClient\s*\([^)]*\burl\s*=/.test(code + text.match(/@FeignClient\s*\([^)]*\)/)?.[0]))
    problems.push("@FeignClient(url = ...) hard-codes an address. Use name = \"<folder-name>\" so Eureka/Kubernetes DNS resolves it.");
  if (/https?:\/\/(localhost|127\.0\.0\.1|[\w-]+\.svc(\.cluster\.local)?)(:\d+)?/.test(withStrings) && !isTest)
    problems.push("hard-coded host/port. Call other services by name (OpenFeign name / gRPC target from config).");
}
if (own && /\.py$/.test(file) && !/(^|\/)tests?\//.test(file)) {
  const code = readDisk(file).replace(/^\s*#.*$/gm, "");
  if (/https?:\/\/(localhost|127\.0\.0\.1|[\w-]+\.svc)(:\d+)?/.test(code)) problems.push("hard-coded host/port in Python code; take the base URL from config (pydantic-settings).");
}
if (own && /\.(sql|ya?ml)$/.test(file) && /db\/migration|application/.test(file)) {
  const text = readDisk(file);
  const m = text.match(/\b(?:FROM|JOIN|INTO|UPDATE|REFERENCES)\s+(?:\w+\.)?(account|project|catalog|payment|provisioning|ai_codegen|ai_assistant)_\w+/i);
  if (m && !m[1].toLowerCase().startsWith(ownShort === "user" ? "account" : ownShort === "project" ? "project" : ownShort))
    if (!(ownShort === "project" && m[1].toLowerCase() === "catalog"))
      problems.push(`touches a table prefixed "${m[1]}_" which another service owns. Ask its API or use its event (hard rule 1).`);
}
if (own && /build\.gradle$/.test(file)) {
  const text = readDisk(file);
  if (/project\(\s*['"]:(user|project|payment|notification|provisioning)[-\w]*['"]\s*\)/.test(text)) problems.push("depends on another service as a Gradle project (no compile-time coupling).");
  if (/['"]org\.springframework\.(boot|cloud):[\w.-]+:\d/.test(text)) problems.push("a version on a Spring Boot/Cloud artifact. The BOM manages it; remove the version.");
  if (/group\s*=\s*['"]com\.webblock['"]/.test(text)) problems.push("group should be org.kshrd.webblock.");
}

if (problems.length)
  warn(`Service-boundary rule broken in ${file}:\n- ${problems.join("\n- ")}\nSee .claude/rules/microservice-boundaries.md and cross-service-change.md.`);
ok();
