---
description: Run a security pass on the current diff (or a named service) with the security-auditor agent plus quick mechanical checks
argument-hint: "[service-name | diff]"
---
Security scan of **$ARGUMENTS** (default `diff`).

1. Mechanical checks first (show output; never open `.env*`, keys or realm exports):
   - `git diff --name-only` (or the service folder) and list files that are controllers, gRPC servers, listeners, `SecurityConfig`, `application*.yml`, migrations.
   - Secrets in changed files: `grep -rnE "(password|secret|api[_-]?key|token)\s*[:=]\s*['\"]?[A-Za-z0-9/+_-]{8,}" <files>` and report values that are not `${PLACEHOLDER}`.
   - Logging of sensitive words: `grep -rnE "log\.(info|debug|warn|error)\(.*(token|password|otp|authorization|khqr|email)" <files>`.
   - String-built SQL: `grep -rnE "(\"|')\s*(SELECT|UPDATE|DELETE|INSERT)[^\"']*(\+|String\.format|\{)" <files>`.
   - Controllers without an owner check: list `@GetMapping|@PostMapping|...` methods and whether the handler compares owner with the current user.
2. Launch the **security-auditor** agent on the same scope and merge its findings with step 1.
3. Run `node --test .claude/hooks/tests/hooks.test.mjs` only if a hook file changed.

Output: findings most severe first (severity - file:line - exploit input - impact - smallest fix), then the list of things checked and found clean.
Finish with **"No blocking issues"** or **"Fix first: N"**. Do not change code unless asked.
