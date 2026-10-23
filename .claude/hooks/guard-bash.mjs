// PreToolUse (Bash): stop dangerous or irreversible shell commands. Not a full sandbox — a safety net.
import { readInput, block, ok } from "./lib.mjs";

const cmd = (readInput().tool_input?.command || "").replace(/\s+/g, " ");
const rules = [
  [/\bgit push\b.*(--force\b|-f\b|--force-with-lease)/, "force push is not allowed. Push normally or ask the user."],
  [/\bgit push\b.*\b(main|master|develop)\b/, "don't push straight to main/master/develop. Open a branch + PR."],
  [/\bgit reset --hard\b|\bgit clean -[a-z]*f/, "this throws away work. Ask the user first."],
  [/\brm -rf? +(\/|~|\$HOME|\.\.?)(\s|$)/, "refusing to delete a root/home/project directory."],
  [/\bdocker(-| )compose\b.*\bdown\b.*(-v\b|--volumes)/, "`down -v` deletes all local databases. Ask the user first."],
  [/\bdocker (system|volume) prune\b/, "prune deletes data. Ask the user first."],
  [/\bkubectl\b.*\bdelete\b.*\b(ns|namespace|namespaces|pv|pvc)\b/, "deleting namespaces/volumes is destructive. Ask the user first."],
  [/\bkubectl\b.*--context[= ]\S*prod/, "no direct kubectl on production. Use GitOps (Argo CD)."],
  [/\bflyway(Clean| clean)\b|flyway\.clean/, "flyway clean wipes the database."],
  [/\b(drop|truncate) (database|schema|table)\b/i, "destructive SQL. Write a migration or ask the user."],
  [/(^|[;&|]\s*)(printenv|env)\s*$/, "printing all env vars can expose secrets."],
];
for (const [re, why] of rules) if (re.test(cmd)) block(`Blocked: ${why}\nCommand: ${cmd}`);

// Reading a real .env file (".env", ".env.local" …) exposes secrets; ".env.example" / ".env.sample" is fine.
if (/\b(cat|less|more|head|tail|bat|grep|sed|awk|source|\.)\b/.test(cmd)) {
  const envFiles = cmd.match(/(?:^|[\s/'"=])\.env(?:\.[\w-]+)?(?=$|[\s'";|&])/g) || [];
  if (envFiles.some(f => !/\.(example|sample|template)$/.test(f.trim())))
    block(`Blocked: reading .env exposes secrets. Use .env.example to see variable names.\nCommand: ${cmd}`);
}
ok();
