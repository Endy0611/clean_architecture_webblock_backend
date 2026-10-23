# WebBlock

AI-powered no-code website builder for small businesses (cafés, salons, shops...).
Owners pick a template → fill business info → design in the **Puck** editor → preview → choose a **WebBlock subdomain** → the **AI generates** a Next.js site + backend + DB → **CI/CD deploys** it on its own infrastructure → owners manage products in the **Business Portal** (web + mobile). WebBlock admins run the platform in the **Admin Portal**.

Generated sites are **showcase only** — no cart, checkout, orders or bookings. The only payment is the owner's WebBlock subscription (14-day free trial, then Plus / Pro / Ultra monthly via WeBill 365 KHQR).

## Source of truth (read before changing behaviour)
- Features (10): @docs/specs/feature-detail.md
- Business rules (short): @docs/specs/business-rules.md
- Open questions — ask, don't guess: @docs/specs/open-questions.md
- Tables by service: `docs/specs/data-dictionary.md` (read when touching DB/entities)
- Status enums & flows: `docs/specs/status-flows.md`
- Screen-by-screen workflow: `docs/specs/workflow.md`

## Repo layout (this repo = backend only)
Every service is a top-level folder with its own build and its own database.
The specs use slightly different service names — map them with this table:

| Folder | Spec name | Stack | Port | API prefix | Owns |
|---|---|---|---|---|---|
| `discovery-service` | — | Spring Boot · Eureka server | 8761 | — | local only |
| `api-gateway` | — | Spring Cloud Gateway (WebFlux) | 8080 | — | local only |
| `user-service` | account-service | Spring Boot | 8081 | `/api/user/v1` | `account_*` tables |
| `project-service` | project-service + catalog-service | Spring Boot | 8082 | `/api/project/v1` | `project_*`, `catalog_*` |
| `payment-service` | payment-service | Spring Boot | 8083 | `/api/payment/v1` | `payment_*` |
| `notification-service` | notification-service | Spring Boot | 8084 | `/api/notification/v1` | notifications |
| `provisioning-service` | provisioning-service | Python · FastAPI | 8085 | `/api/provisioning/v1` | `provisioning_*` |
| `ai-generator-service` | ai-service | Python · FastAPI | 8086 | `/api/ai-generator/v1` | `ai_codegen_*`, `ai_assistant_*` |

Also here: `config-repo/` (per-profile YAML placeholders, no config-server yet), `scripts/`,
`docs/specs/`. Not in this repo: `apps/web`, `apps/mobile`, `packages/puck-blocks`,
`templates/site-template`, `infra/`, `docker-compose.yml` (frontend / infra rules only apply there).

Most services are still **empty scaffolds**. Check what exists before assuming a feature is there.
The Java services are already wired: Eureka client, `@EnableFeignClients`, `application-k8s.yml`.
Package layout in each Java service (`com.webblock.<service>`): `controller`, `service` (+ `service/impl`),
`model/dto`, `model/entity`, `repository`, `exception`, `config`, `client` (OpenFeign clients to other services),
`constraint` (enums), `util` (reusable helpers).
Swagger UI: all services at `http://localhost:8080/swagger-ui.html` (gateway, pick the service top-right),
or one service at `http://localhost:<port>/swagger-ui.html`. Each service's `OpenApiConfig` sets
`servers = @Server(url = "/")` so "Try it out" stays on the page's own host (no CORS) — keep it. When a new
service is added, add its `/<service>/v3/api-docs` route + `springdoc.swagger-ui.urls` entry in `api-gateway` (springdoc-openapi
**3.1.1**, pinned as `springdocVersion` in each `build.gradle` — not managed by the Boot BOM).


## Local vs Kubernetes (both must keep working)
- **Local:** clients → `api-gateway` (Spring Cloud Gateway) → services found via `discovery-service` (Eureka).
- **uat/prod (Kubernetes):** clients → **Istio** → services via Kubernetes DNS. `api-gateway` and
  `discovery-service` are not deployed; services run with the `k8s` profile (Eureka off).
- Same public paths in both, services call each other by name only, no business logic in the
  gateway, every service validates the JWT itself. Details: `.claude/rules/microservice-boundaries.md`.

## Tech
Java 21 · Spring Boot **4.1.1** · Spring Cloud **2025.1.3** · Gradle 9.8 (Groovy, wrapper per service) ·
base package `com.webblock.<service>` · Python 3.12 + FastAPI · PostgreSQL (DB per service) · Redis ·
Keycloak · Ollama / vLLM (Qwen 2.5 Coder) · Gitea · Docker · Kubernetes + Istio · Jenkins · Argo CD ·
Prometheus/Grafana. All Java services use the **same** Boot and Spring Cloud versions; never put
versions on Boot/Cloud artifacts.

## Commands
- Java service: `cd <folder> && ./gradlew test` · `./gradlew build` · run: `./gradlew bootRun`
- All Java services: `./scripts/gradle-all.sh build`
- Python service: `cd <folder> && python -m pytest` · run: `uvicorn app.main:app --reload`
- Local start order: `discovery-service` → `api-gateway` → the services.
- Port 8080 may be busy on a dev machine — run the gateway with `--args='--server.port=8090'`.

## Hard rules
1. One service owns its tables. Never query another service's DB — call its API or consume its event.
2. Never edit an applied migration (Flyway `V<n>__*.sql` / Alembic revision). Add a new one.
3. Use the exact enum values from `status-flows.md`. No new statuses without team approval.
4. Puck blocks are only: Hero, Text, Product Cards, About, Location, Footer.
5. Subdomain and business type never change after creation. No custom domains.
6. Retryable writes need an idempotency key. Failure messages must be sanitized.
7. Never commit secrets. `.env*` files are off-limits.
8. Business Portal (owner) and Admin Portal (admin) must stay separate; check ownership on every owner request.

## How to work (team protocol)
- **Evidence over assumption.** Never fix what you haven't proven broken.
- **Reproduce first.** For a bug: write the failing test or exact repro steps before touching code.
- **State the hypothesis** in one sentence before editing. Narrow it down until one cause is left.
- **Facts, not intuition.** Back every conclusion with a log line, stack trace or test result.
- Small changes, one service at a time. Run that service's tests before saying "done".
- Explain in simple, short English.
