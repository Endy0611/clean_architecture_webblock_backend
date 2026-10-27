// Builds the Claude Code plugin ".claude/plugins/webblock" from the files that live in .claude/.
// .claude/{skills,agents,commands,hooks} stay the single source of truth; the plugin folder is GENERATED. Do not edit it by hand.
// Run from the repo root:  node scripts/build-plugin.mjs        (then commit the result)
// Backend only: frontend / Puck / site-template items are left out on purpose.
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, ".claude");
const out = path.join(src, "plugins", "webblock");
const VERSION = "0.1.0";

const SKIP = {
  skills: ["change-puck-block"],            // Puck editor = frontend
  agents: ["frontend-engineer.md"],         // frontend
  commands: [],
  hooks: ["scope-guard.mjs"],               // checks generated-site code (templates/site-template), not in this repo
};

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, ".claude-plugin"), { recursive: true });

const copied = {};
for (const kind of ["skills", "agents", "commands", "hooks"]) {
  const from = path.join(src, kind);
  if (!existsSync(from)) continue;
  cpSync(from, path.join(out, kind), {
    recursive: true,
    filter: (p) => !SKIP[kind].includes(path.basename(p)),
  });
  copied[kind] = readdirSync(path.join(out, kind)).length;
}

// Hooks: same wiring as .claude/settings.json, but paths use ${CLAUDE_PLUGIN_ROOT}.
const h = (file, timeout = 10) => ({ type: "command", command: `node "\${CLAUDE_PLUGIN_ROOT}/hooks/${file}"`, timeout });
const hooks = {
  hooks: {
    SessionStart: [{ hooks: [h("session-context.mjs", 15)] }],
    PreToolUse: [
      { matcher: "Edit|Write|MultiEdit|NotebookEdit", hooks: [h("protect-files.mjs"), h("protect-contracts.mjs"), h("secret-scan.mjs")] },
      { matcher: "Bash", hooks: [h("guard-bash.mjs"), h("commit-guard.mjs", 20)] },
    ],
    PostToolUse: [
      { matcher: "Edit|Write|MultiEdit", hooks: [h("format.mjs", 30), h("check-yaml.mjs"), h("layer-guard.mjs"), h("boundary-guard.mjs"), h("log-guard.mjs")] },
    ],
  },
};
writeFileSync(path.join(out, "hooks", "hooks.json"), JSON.stringify(hooks, null, 2) + "\n");

writeFileSync(path.join(out, ".claude-plugin", "plugin.json"), JSON.stringify({
  name: "webblock",
  version: VERSION,
  description: "WebBlock backend toolkit: service-to-service contracts (gRPC + RabbitMQ), layered Java/Python layout checks, secret and boundary guards, and skills/agents/commands for the microservices.",
  author: { name: "WebBlock backend team" },
  keywords: ["microservices", "spring-boot", "grpc", "rabbitmq", "contracts", "security"],
}, null, 2) + "\n");

writeFileSync(path.join(out, "README.md"), `# webblock plugin (generated)

Backend toolkit for the WebBlock microservices. **Generated** from \`.claude/{skills,agents,commands,hooks}\` by
\`node scripts/build-plugin.mjs\` — change the files in \`.claude/\`, then rebuild. Never edit this folder by hand.

## What is inside (${Object.entries(copied).map(([k, v]) => `${k}: ${v}`).join(", ")})
- **skills/** add-feature-folder, add-grpc-method, add-rabbit-event, adopt-outbox-inbox, feign-to-grpc, change-contract, new-spring-service, ...
- **agents/** contract-guardian, security-auditor, integration-tester, messaging-engineer, python-service-engineer, backend-engineer, ...
- **commands/** /contract-check, /sync-check, /service-map, /impact, /layout-check, /security-scan, /new-grpc, /new-event, /hooks-test, ...
- **hooks/** protect-files, protect-contracts, secret-scan, guard-bash, commit-guard, layer-guard, boundary-guard, log-guard (+ tests)

## Left out on purpose
Frontend / Puck items (\`frontend-engineer\`, \`change-puck-block\`, \`scope-guard\`). **Rules are not part of plugins**:
the rule files in \`.claude/rules/\` (repo-layout, contracts, grpc, rabbitmq-events, ...) only load inside this repo, and the skills,
agents and hook messages point to them. In another repo, copy \`.claude/rules/\` too.

## Use it
- Try it in any repo: \`claude --plugin-dir <path-to>/.claude/plugins/webblock\`
- **Do not enable it inside this repo**: the same skills, agents, commands and hooks already load from \`.claude/\`, so the hooks would run twice.
- Slash commands from a plugin are namespaced, for example \`/webblock:contract-check\`.
- Test the hooks: \`node --test hooks/tests/hooks.test.mjs\` (run from this folder).

Version ${VERSION}. Rebuild after every change to the source files.
`);

console.log("plugin written to", path.relative(root, out), copied);
