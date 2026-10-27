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
Every deployable service is a folder under `services/`, with its own build and its own database.
Two shared folders sit next to it: `contracts/` (the agreements between services) and `commons/` (shared helper library, design in review).
The specs use slightly different service names — map them with this table:

| Folder (under `services/`) | Spec name | Stack | Port | API prefix | Owns |
|---|---|---|---|---|---|
| `discovery-service` | — | Spring Boot · Eureka server | 8761 | — | local only |
| `api-gateway` | — | Spring Cloud Gateway (WebFlux) | 8080 | — | local only |
| `user-service` | account-service | Spring Boot | 8081 | `/api/user/v1` | `account_*` tables |
| `project-service` | project-service + catalog-service | Spring Boot | 8082 | `/api/project/v1` | `project_*`, `catalog_*` |
| `payment-service` | payment-service | Spring Boot | 8083 | `/api/payment/v1` | `payment_*` |
| `notification-service` | notification-service | Spring Boot | 8084 | `/api/notification/v1` | notifications |
| `provisioning-service` | provisioning-service | Python · FastAPI | 8085 | `/api/provisioning/v1` | `provisioning_*` |
| `webblock-aicode-service` | ai-service (AI Codegen) | Python · FastAPI | 8086 | `/api/ai-generator/v1` | `ai_codegen_*`, `ai_assistant_*` |

`webblock-aicode-service` is its **own git repository** (own `.git`, own `CLAUDE.md`, own `.claude`); it keeps its own folder layout.
Never `git add` it from this root. The full map and "what each service gives and needs" is in `.claude/rules/repo-layout.md`.

Also here: `contracts/` (`proto/` for gRPC, `events/` for RabbitMQ, `CATALOG.md` = who gives what to whom; read its `README.md`),
`commons/` (reserved), `config-repo/` (per-profile YAML placeholders, no config-server yet), `scripts/`, `docs/specs/`.
Not in this repo: `apps/web`, `apps/mobile`, `packages/puck-blocks`, `templates/site-template`, `infra/`, `docker-compose.yml`
(this repo is backend only).

Most services are still **empty scaffolds**. Check what exists before assuming a feature is there.
The Java services are already wired: Eureka client, `@EnableFeignClients`, `application-k8s.yml`.
Package layout in each Java service (`org.kshrd.webblock.<service>`, Notion "Web Block architecture" §6.1): `presentation` (`rest`, `grpc`, `messaging`),
`application/<feature>` (`request`, `response`, `mapper`, `handler`), `domain/<feature>` (`model`, `event`),
`infrastructure` (`persistence`, `messaging`, `client`, `config`, `security`), `common` (`presentation`, `domain`).
`domain` never imports the other layers. Migrations stay in `src/main/resources/db/migration`.
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
base package `org.kshrd.webblock.<service>` · Python 3.12 + FastAPI · PostgreSQL (DB per service) · Redis ·
Keycloak · Ollama / vLLM (Qwen 2.5 Coder) · Gitea · Docker · Kubernetes + Istio · Jenkins · Argo CD ·
Prometheus/Grafana. All Java services use the **same** Boot and Spring Cloud versions; never put
versions on Boot/Cloud artifacts.

## Commands
- Java service: `cd services/<folder> && ./gradlew test` · `./gradlew build` · run: `./gradlew bootRun`
- All Java services: `./scripts/gradle-all.sh build`
- Python service: `cd services/<folder> && python -m pytest` · run: `uvicorn app.main:app --reload`
- Contracts: `/contract-check` (compile protos, validate events, compare with `contracts/CATALOG.md`). Claude hooks tests: `node --test .claude/hooks/tests/hooks.test.mjs`
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

## Service-to-service rules (read before touching a call, an event or a contract)
- Three ways to talk: **REST** (browser, mobile, frontend), **gRPC** (ask and wait, inside the cluster), **RabbitMQ event** (something happened).
  Contracts for the last two live in `contracts/` and are owned by the service named in the path. Never edit another service's contract.
- Existing calls are OpenFeign (REST) and stay until migrated one by one; new calls start as a gRPC contract. See `.claude/rules/grpc.md`.
- Events use outbox (sender) + inbox (consumer): `.claude/rules/rabbitmq-events.md`. Changing anything other services know: `.claude/rules/cross-service-change.md`.
- Java layout: `.claude/rules/java-layout.md`. Python: `python-layout.md`. REST format: `rest-response-format.md`. Tokens: `auth-tokens.md`.

## Claude Code setup (`.claude/`)
- **Rules** load by file path (see `paths:` in each file); always-on: `repo-layout`, `cross-service-change`, `git-workflow`, `security`, `debugging`, `microservice-boundaries`.
- **Skills** (run with `/<name>`): `add-feature-folder`, `add-grpc-method`, `add-rabbit-event`, `adopt-outbox-inbox`, `feign-to-grpc`, `change-contract`, `new-spring-service`, plus older ones.
- **Agents**: `contract-guardian`, `security-auditor`, `integration-tester`, `messaging-engineer`, `python-service-engineer`, `backend-engineer`, `code-reviewer`, `microservice-architect`.
- **Commands**: `/contract-check`, `/sync-check`, `/service-map`, `/impact`, `/layout-check`, `/security-scan`, `/new-grpc`, `/new-event`, `/hooks-test`, `/test`, `/review`, `/commit`.
- **Hooks** (safety nets, they block or warn): `protect-files`, `protect-contracts` (committed contracts are frozen), `secret-scan`, `guard-bash`, `commit-guard`,
  `layer-guard`, `boundary-guard`, `log-guard`. Tests: `node --test .claude/hooks/tests/hooks.test.mjs`.
- **Plugin** `.claude/plugins/webblock/` = the skills, agents, commands and hooks above packaged for use in other repos (`claude --plugin-dir <path>`).
  It is GENERATED: edit `.claude/{skills,agents,commands,hooks}`, then run `node scripts/build-plugin.mjs`. Do not enable it inside this repo (hooks would run twice). Rules are not part of plugins.

## How to work (team protocol)
- **Evidence over assumption.** Never fix what you haven't proven broken.
- **Reproduce first.** For a bug: write the failing test or exact repro steps before touching code.
- **State the hypothesis** in one sentence before editing. Narrow it down until one cause is left.
- **Facts, not intuition.** Back every conclusion with a log line, stack trace or test result.
- Small changes, one service at a time. Run that service's tests before saying "done".
- Explain in simple, short English.
