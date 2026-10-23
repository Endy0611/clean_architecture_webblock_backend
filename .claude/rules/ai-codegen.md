---
paths:
  - "ai-generator-service/**"
  - "templates/site-template/**"
---
# AI generation & editor assistant

## Codegen harness (Puck → Next.js site)
- Input is frozen first: `input_versions.captured_input` + `input_hash` (SHA-256 of canonical JSON). Never generate from live, unfrozen data.
- Output must follow `templates/site-template` structure exactly. The model fills block renderers, Prisma schema (from `product_type_schemas.field_schema` custom fields) and CRUD API route handlers — nothing else.
- Prefer deterministic templating; use the LLM only where the template can't decide. Same input → same output.
- A run succeeds only if every `required` validation passes: PUCK_SCHEMA, TYPE_CHECK, BUILD, LINT, SMOKE_TEST, SECURITY. Store the report as a `CHECK_REPORT` artifact.
- Record `model_name`, `input_tokens`, `output_tokens`, `attempt` for every run.
- Push to the project's Git repo (Gitea) only after all checks pass; save `source_commit_sha` (immutable).
- No payment/cart/checkout/booking code may appear in generated sites. The SECURITY check must fail if it does.
- Model calls go to a local server (Ollama / vLLM) configured by env; set timeouts and a max-attempt limit.

## Editor assistant (chat)
- The model returns a **change set**, not code: items with `ADD_COMPONENT | UPDATE_PROPS | DELETE_COMPONENT | MOVE_COMPONENT`.
- Validate every item against `puck_component_definitions` (`allowed_operations`, `editable_props_schema`) and `base_edit_revision`. Fail → status `REJECTED` + `rejection_code`; UI says "Request cannot be done".
- The user applies the change set in the editor (→ `APPLIED`) or discards it.
