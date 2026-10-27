# webblock plugin (generated)

Backend toolkit for the WebBlock microservices. **Generated** from `.claude/{skills,agents,commands,hooks}` by
`node scripts/build-plugin.mjs` — change the files in `.claude/`, then rebuild. Never edit this folder by hand.

## What is inside (skills: 13, agents: 13, commands: 17, hooks: 13)
- **skills/** add-feature-folder, add-grpc-method, add-rabbit-event, adopt-outbox-inbox, feign-to-grpc, change-contract, new-spring-service, ...
- **agents/** contract-guardian, security-auditor, integration-tester, messaging-engineer, python-service-engineer, backend-engineer, ...
- **commands/** /contract-check, /sync-check, /service-map, /impact, /layout-check, /security-scan, /new-grpc, /new-event, /hooks-test, ...
- **hooks/** protect-files, protect-contracts, secret-scan, guard-bash, commit-guard, layer-guard, boundary-guard, log-guard (+ tests)

## Left out on purpose
Frontend / Puck items (`frontend-engineer`, `change-puck-block`, `scope-guard`). **Rules are not part of plugins**:
the rule files in `.claude/rules/` (repo-layout, contracts, grpc, rabbitmq-events, ...) only load inside this repo, and the skills,
agents and hook messages point to them. In another repo, copy `.claude/rules/` too.

## Use it
- Try it in any repo: `claude --plugin-dir <path-to>/.claude/plugins/webblock`
- **Do not enable it inside this repo**: the same skills, agents, commands and hooks already load from `.claude/`, so the hooks would run twice.
- Slash commands from a plugin are namespaced, for example `/webblock:contract-check`.
- Test the hooks: `node --test hooks/tests/hooks.test.mjs` (run from this folder).

Version 0.1.0. Rebuild after every change to the source files.
