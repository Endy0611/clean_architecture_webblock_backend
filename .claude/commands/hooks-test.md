---
description: Run the tests of the Claude hooks (contract freeze, secret scan, layer/boundary/log guards, commit guard, bash guard)
---
Run `node --test .claude/hooks/tests/hooks.test.mjs` from the repo root and show the summary line (`# tests`, `# pass`, `# fail`).
For each failing test give: its name, which hook it exercises, the real assertion error, and your hypothesis in one sentence. Do not edit a hook unless I ask.
If I changed a hook file, remind me to add a test for the new rule in `.claude/hooks/tests/hooks.test.mjs` (input JSON -> exit code 2 for PreToolUse, `{"decision":"block"}` for PostToolUse).
