---
paths:
  - "ai-generator-service/**"
  - "provisioning-service/**"
---

# Python services (ai-generator-service, provisioning-service)

- Python 3.12+, FastAPI + Uvicorn, Pydantic v2 for request/response models.
- Dependencies pinned in `pyproject.toml` / `requirements.txt`; local `.venv/` (git-ignored).
- Layout: `app/main.py`, `app/api/` (routers), `app/application/` (use cases),
  `app/domain/` (rules, enums), `app/infrastructure/` (DB, clients), `tests/` (pytest).
- Same API contract as Java services (`api-contracts.md`): `/api/ai-generator/v1/...`,
  `/api/provisioning/v1/...`, camelCase JSON, ProblemDetail-shaped errors with `code`, `GET /health`.
- Auth: validate the Keycloak JWT in the service (e.g. `python-jose` / `pyjwt` + JWKS). Same
  ownership and admin-role rules as `security.md`.
- Database: own Postgres DB, SQLAlchemy 2 + **Alembic** migrations. Tables, types and enums
  exactly as `docs/specs/data-dictionary.md` / `status-flows.md`; never edit an applied revision.
- Discovery: locally register with Eureka (`py-eureka-client`, app name = folder name) behind a
  setting `EUREKA_ENABLED`; on Kubernetes it is `false`.
- Config from env vars (`pydantic-settings`); never hard-code keys or model URLs.
- Long work (generation, deploy) runs in the background; the API returns `202` + id and
  reports progress via status endpoints / events. Never hold an HTTP request for minutes.
- Tests: pytest + httpx `TestClient`; no real LLM / Gitea / Kubernetes calls (use fakes).
