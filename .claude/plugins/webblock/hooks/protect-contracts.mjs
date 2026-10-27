// PreToolUse (Edit|Write|MultiEdit): a COMMITTED contract in contracts/ is frozen in shape.
// Blocks edits that remove/renumber a protobuf field, remove an RPC, or remove/retype/newly-require a field
// in an event schema. New files and files not committed yet stay editable (they are still drafts).
// Rule: .claude/rules/contracts.md — a breaking change is a new v2 next to v1.
import { execFileSync } from "node:child_process";
import { readInput, pendingChange, block, ok, projectDir } from "./lib.mjs";

const { file, before, after } = pendingChange(readInput());
if (!/^contracts\/(proto\/.+\.proto|events\/.+\.json)$/.test(file) || !before) ok();

let tracked = false;
try { execFileSync("git", ["ls-files", "--error-unmatch", file], { cwd: projectDir, stdio: "ignore" }); tracked = true; } catch {}
if (!tracked) ok(); // still a draft

const why = (msg) => block(
  `Blocked: ${file} is a committed contract and this edit would break existing consumers.\n${msg}\n` +
  `Allowed in v1: add a field with a NEW number, a new RPC/message, a new optional property. For anything else create a v2 next to v1 ` +
  `(.claude/rules/contracts.md, cross-service-change.md). If you are the owner and sure, ask the user to make this edit by hand.`);

if (file.endsWith(".proto")) {
  const parse = (src) => {
    const text = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const fields = new Map(), rpcs = new Set(), stack = [];
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      let m;
      if ((m = line.match(/^(message|enum|service)\s+(\w+)\s*\{/))) { stack.push(m[2]); if (m[1] === "service") continue; }
      else if (/^oneof\s+\w+\s*\{/.test(line)) { stack.push("oneof"); continue; }
      if ((m = line.match(/^(?:repeated\s+|optional\s+)?(?:map<[^>]+>|[\w.]+)\s+(\w+)\s*=\s*(\d+)/)) || (m = line.match(/^(\w+)\s*=\s*(-?\d+)\s*(?:\[.*\])?;/)))
        fields.set(`${stack.filter((s) => s !== "oneof").join(".")}.${m[1]}`, m[2]);
      const closes = (line.match(/\}/g) || []).length - (line.match(/\{/g) || []).length;
      for (let i = 0; i < closes; i++) stack.pop();
    }
    for (const r of text.matchAll(/\brpc\s+(\w+)\s*\(/g)) rpcs.add(r[1]);
    return { fields, rpcs };
  };
  const o = parse(before), n = parse(after);
  for (const [name, num] of o.fields) {
    if (!n.fields.has(name)) why(`Field/enum value "${name}" (number ${num}) is removed or renamed.`);
    if (n.fields.get(name) !== num) why(`Field "${name}" changes number ${num} -> ${n.fields.get(name)}.`);
  }
  for (const r of o.rpcs) if (!n.rpcs.has(r)) why(`RPC "${r}" is removed or renamed.`);
  ok();
}

// event schema (JSON)
let oj, nj;
try { oj = JSON.parse(before); } catch { ok(); }
try { nj = JSON.parse(after); } catch { block(`Blocked: ${file} would no longer be valid JSON after this edit.`); }
const props = (j) => j?.properties || {};
for (const [k, v] of Object.entries(props(oj))) {
  if (!(k in props(nj))) why(`Property "${k}" is removed or renamed.`);
  if (JSON.stringify(v?.type) !== JSON.stringify(props(nj)[k]?.type) && v?.type !== undefined) why(`Property "${k}" changes type.`);
  if (JSON.stringify(v?.const) !== JSON.stringify(props(nj)[k]?.const) && v?.const !== undefined) why(`Property "${k}" changes its fixed value.`);
}
const oreq = new Set(oj?.required || []);
for (const r of nj?.required || []) if (!oreq.has(r)) why(`Property "${r}" becomes required (consumers/senders on v1 do not send it).`);
ok();
