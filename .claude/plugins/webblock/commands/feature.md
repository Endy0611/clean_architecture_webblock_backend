---
description: Plan a WebBlock feature from the spec before writing code
argument-hint: "[feature name or number 01-10]"
---
Plan the WebBlock feature: **$ARGUMENTS**

1. Read its section in @docs/specs/feature-detail.md and the matching section in `docs/specs/workflow.md`.
2. List what each role can do (User / Admin / System) and every "Is …?" decision with its Yes/No result.
3. List the services, tables (from `docs/specs/data-dictionary.md`), endpoints and screens involved.
4. List related rules from `docs/specs/business-rules.md` and any item in `docs/specs/open-questions.md` that blocks it.
5. Give a step-by-step plan: backend → frontend → tests. Small steps, one service at a time.

Do not write code yet. Ask me the open questions first. Short, simple English.
