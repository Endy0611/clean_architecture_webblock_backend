# WebBlock — Claude Code setup

Copy everything in this folder to the **root of the WebBlock repo**.

| Path | What it does |
|---|---|
| `CLAUDE.md` | Project brief Claude reads every session: product, repo layout, commands, hard rules, team protocol. Imports the specs. |
| `docs/specs/` | Source of truth: feature detail (10 features), data dictionary by service, workflow, business rules, status enums, open questions. |
| `.claude/rules/` | Short rules that load only when Claude touches matching files (Spring, DB, API, Next.js, Puck, UI style, AI codegen, payment, provisioning, infra, tests). `security.md` + `debugging.md` always load. |
| `.claude/agents/` | 8 helpers: spec-guardian, backend-engineer, frontend-engineer, db-schema-reviewer, ai-codegen-engineer, devops-engineer, code-reviewer, bug-investigator. |
| `.claude/skills/` | Step-by-step playbooks: new-spring-service, add-table-from-dictionary, add-api-endpoint, add-notification-event, change-puck-block, khqr-checkout, publish-flow, investigate-bug. |
| `.claude/commands/` | Slash commands: `/feature`, `/spec-check`, `/review`, `/migration`, `/test`, `/stack`, `/open-questions`, `/commit`. |
| `.claude/hooks/` | Node scripts (no jq needed): block secrets / lockfiles / applied migrations, block dangerous shell commands, auto-format, warn on cart/checkout code in generated sites, session summary. |
| `.claude/settings.json` | Shared permissions (allow / ask / deny), hooks, enabled MCP servers. Commit it. |
| `.claude/settings.local.json` | Your personal extras. **Don't commit** (see `.gitignore.claude`). |
| `.mcp.json` | MCP servers: context7 (library docs), figma, playwright (UI tests), dbhub (read-only Postgres). |

## Setup
1. Copy files to the repo root. Add the lines from `.gitignore.claude` to `.gitignore`.
2. Need Node 18+ (hooks run with `node`).
3. Fix the "Repo layout" block in `CLAUDE.md` if your folders differ.
4. Create a read-only Postgres user for dbhub, or set `WEBBLOCK_DB_DSN`.
5. Start `claude` in the repo → approve the project MCP servers → run `/mcp` to log in to Figma.
6. Answer `docs/specs/open-questions.md` as a team — Claude will ask about these until they're decided.
