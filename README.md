# WebBlock Backend

WebBlock is an AI-powered no-code website builder for small businesses (cafés, salons, shops...).
The owner picks a template, fills in business info, designs the site in the **Puck** editor, chooses a
**subdomain**, and WebBlock **generates, deploys and hosts** the site. Owners manage products in the
**Business Portal**; WebBlock staff run the platform in the **Admin Portal**.

This repo is the **backend only** (microservices). The web app, mobile app and infra live in other repos.

> Generated sites are **showcase only** (no cart, checkout, orders or bookings).
> The only payment is the owner's WebBlock subscription (14-day free trial, then Plus / Pro / Ultra via WeBill 365 KHQR).

---

## 1. Folder structure

```
Webblock_Backend/
├── services/            every deployable service (one folder = one service = one database)
├── contracts/           agreements between services (gRPC protos + RabbitMQ event schemas)
├── commons/             shared helper library (reserved, no code yet)
├── config-repo/         per-profile YAML placeholders (dev / uat / prod). No real secrets
├── scripts/             helper scripts (build all services, build Claude plugin)
├── docs/specs/          the source of truth: features, business rules, data dictionary
├── .claude/             Claude Code setup (rules, skills, agents, hooks)
├── CLAUDE.md            project rules for Claude Code and the team
└── README.md            this file
```

### What each top-level folder is for

| Folder | Use it for |
|---|---|
| `services/` | All the code. Each service has its own build and its own database. |
| `contracts/proto/webblock/<service>/` | gRPC contracts. Owned by the service named in the path. |
| `contracts/events/<service>/` | RabbitMQ event JSON schemas (`*.v1.schema.json`). `envelope.v1.schema.json` is the shared wrapper. |
| `contracts/CATALOG.md` | One table: who gives what to whom. **Update it when a contract changes.** |
| `commons/` | Only auth, errors, trace headers. Never business code. |
| `config-repo/` | `application.yml` plus `<service>-dev/uat/prod.yml` placeholders. |
| `scripts/gradle-all.sh` | Build or test all Java services in one command. |
| `docs/specs/` | Read before changing behaviour (see section 6). |

---

## 2. Services

| Folder (`services/`) | What it does | Stack | Port | API prefix |
|---|---|---|---|---|
| `discovery-service` | Eureka server (finds services). **Local only** | Spring Boot | 8761 | — |
| `api-gateway` | Single entry point, routing only. **Local only** | Spring Cloud Gateway | 8080 | — |
| `user-service` | Accounts, login session, profile (`account_*` tables) | Spring Boot | 8081 | `/api/user/v1` |
| `project-service` | Projects, pages, catalog/products, subdomain, Git repo, edit revision (`project_*`, `catalog_*`) | Spring Boot | 8082 | `/api/project/v1` |
| `payment-service` | Plans, prices, trial, bills (KHQR), subscriptions (`payment_*`) | Spring Boot | 8083 | `/api/payment/v1` |
| `notification-service` | Web / mobile / email alerts. Decides nothing, only sends | Spring Boot | 8084 | `/api/notification/v1` |
| `provisioning-service` | Deploy, redeploy, rollback, hosting, routing (`provisioning_*`) | Python · FastAPI | 8085 | `/api/provisioning/v1` |
| `webblock-aicode-service` | AI: Puck JSON → Next.js code, design assistant (`ai_codegen_*`, `ai_assistant_*`) | Python · FastAPI | 8086 | `/api/ai-generator/v1` |

Notes:
- Most services are still **scaffolds**. Check what exists before assuming a feature is there.
- `webblock-aicode-service` is its **own git repository** (own `.git`, `CLAUDE.md`, `README.md`). Never `git add` it from this root.
- Folder name = `spring.application.name` = Feign client name = Kubernetes Service name.

### Folder layout inside a Java service

Package: `org.kshrd.webblock.<service>` (example `org.kshrd.webblock.user`).

```
services/<name>-service/
├── build.gradle, settings.gradle, gradlew   own Gradle build (Groovy, wrapper per service)
└── src/
    ├── main/
    │   ├── java/org/kshrd/webblock/<service>/
    │   │   ├── presentation/     entry points
    │   │   │   ├── rest/           controllers (HTTP)
    │   │   │   ├── grpc/           gRPC servers
    │   │   │   └── messaging/      RabbitMQ consumers
    │   │   ├── application/<feature>/   one folder per use case / feature
    │   │   │   ├── request/        incoming DTOs
    │   │   │   ├── response/       outgoing DTOs
    │   │   │   ├── mapper/         DTO <-> domain
    │   │   │   └── handler/        the use case logic
    │   │   ├── domain/<feature>/   business core
    │   │   │   ├── model/          entities / value objects
    │   │   │   └── event/          domain events
    │   │   ├── infrastructure/     technical details
    │   │   │   ├── persistence/    JPA repositories
    │   │   │   ├── messaging/      RabbitMQ publishers, outbox/inbox
    │   │   │   ├── client/         calls to other services (Feign / gRPC)
    │   │   │   ├── config/         Spring config (OpenApiConfig, ...)
    │   │   │   └── security/       JWT / Keycloak config
    │   │   └── common/             shared inside this service (presentation, domain)
    │   └── resources/
    │       ├── application.yml       local profile
    │       ├── application-k8s.yml   Kubernetes profile (Eureka off)
    │       └── db/migration/         Flyway migrations  V<yyyyMMddHHmm>__name.sql
    └── test/                       tests
```

**Rule:** `domain` never imports the other layers.

Extra files you may see:
- `user-service/docker-compose.yml` — local **Keycloak** + its own PostgreSQL.
- `payment-service/dev/` — dev helper SQL (e.g. seed a test subscription).

### Folder layout of `webblock-aicode-service` (Python)

```
services/webblock-aicode-service/
├── app/
│   ├── main.py        FastAPI entry
│   ├── worker.py      background worker
│   ├── db.py          database setup
│   ├── api/           HTTP routes
│   ├── schemas/       request/response models
│   ├── services/      business logic
│   ├── core/          config and shared code
│   └── templates/     Next.js site template used for generation
├── sql/               numbered SQL files (001_project.sql ...)
├── tests/             pytest tests
├── pyproject.toml, Pipfile
└── docker-compose.yml
```

`provisioning-service` is only a stub (`main.py`) for now; it will follow the Python layout rules in `.claude/rules/python-layout.md`.

---

## 3. How services talk (local vs Kubernetes)

- **Local:** client → `api-gateway` (8080) → service found through `discovery-service` (Eureka).
- **uat / prod (Kubernetes):** client → **Istio** → service by Kubernetes DNS. Gateway and Eureka are **not deployed**; services run with the `k8s` profile.
- The public paths are the same in both: `/api/<service>/v1/**`.
- Three ways to talk: **REST** (browser/mobile), **gRPC** (ask and wait), **RabbitMQ event** (something happened). Existing calls are OpenFeign; new calls start as gRPC.
- Every service validates the Keycloak JWT itself.

---

## 4. Getting started

### Requirements
Java 21 · Python 3.12 · Docker · PostgreSQL (one DB per service) · Redis · RabbitMQ · Keycloak (see `user-service/docker-compose.yml`).

### Run locally (start order matters)
1. `discovery-service`
2. `api-gateway`
3. the other services

```bash
cd services/<folder>
./gradlew bootRun        # Java service
```

```bash
cd services/webblock-aicode-service
uvicorn app.main:app --reload     # Python service
```

- Port 8080 busy? Run the gateway on another port: `./gradlew bootRun --args='--server.port=8090'`
- Secrets come from **environment variables**. Never commit `.env*` files or real keys.
- Local Keycloak: `cd services/user-service && docker compose up -d`, then create realm `webblock` with roles `user` and `admin`.

### Build and test
```bash
cd services/<folder> && ./gradlew test        # one Java service
cd services/<folder> && ./gradlew build
./scripts/gradle-all.sh build                 # all Java services
cd services/<folder> && python -m pytest      # Python service
```

### Swagger UI
- All services: http://localhost:8080/swagger-ui.html (pick the service at the top right)
- One service: `http://localhost:<port>/swagger-ui.html`

When you add a new service, add its `/<service>/v3/api-docs` route and `springdoc.swagger-ui.urls` entry in `api-gateway`.

---

## 5. Team rules (short)

1. **One service owns its tables.** Never read another service's DB. Call its API or listen to its event.
2. **Never edit an applied migration.** Add a new one (`V<n>__*.sql` / Alembic).
3. Use the exact status values from `docs/specs/status-flows.md`.
4. Puck blocks are only: Hero, Text, Product Cards, About, Location, Footer.
5. Subdomain and business type never change after creation. No custom domains.
6. Retryable writes need an idempotency key. Failure messages must be sanitized (no secrets, stack traces).
7. Never commit secrets or `.env*`.
8. Owner (Business Portal) and Admin (Admin Portal) stay separate. Check ownership on every owner request (return 404 for other owners' data).
9. **Changing a contract** (proto, event, REST field, enum) that other services use? Read `.claude/rules/cross-service-change.md` first. Never edit `v1`; add `v2`. Never edit another service's contract.

### Git workflow
- Work on a branch, not `main`: `feat/<service>-<what>`, `fix/<service>-<what>`, `chore/<what>`, `docs/<what>`.
- Commit message: `type(scope): short summary` (e.g. `feat(contracts): add project CheckAccess v1`).
- Never force push or push to `main`. Open a pull request.
- Keep changes small, one service at a time. Run that service's tests before saying "done".
- Run `git status` first. Do not touch changes you did not make.

---

## 6. Docs to read

| File | Read when |
|---|---|
| `docs/specs/feature-detail.md` | You need to know what a feature must do (10 features) |
| `docs/specs/business-rules.md` | Before changing behaviour |
| `docs/specs/open-questions.md` | Specs disagree. **Ask the team, don't guess** |
| `docs/specs/data-dictionary.md` | Touching DB tables or entities |
| `docs/specs/status-flows.md` | Using status enums |
| `docs/specs/workflow.md` | Screen-by-screen flow |
| `contracts/CATALOG.md` | Who calls / listens to whom |
| `CLAUDE.md` | Full project rules |
| `.claude/rules/repo-layout.md` | Where a new thing belongs |

---

## 7. Claude Code setup (optional)

The `.claude/` folder helps teammates who use Claude Code: **rules** (loaded by file path), **skills** (`/add-feature-folder`, `/add-grpc-method`, `/add-rabbit-event`, ...),
**agents**, **commands** (`/contract-check`, `/sync-check`, `/service-map`, `/review`, `/commit`) and **hooks** (block secrets, frozen contracts, bad layering).
Hook tests: `node --test .claude/hooks/tests/hooks.test.mjs`. More: `CLAUDE-SETUP.md`.

---

## 8. Quick answers

| Question | Answer |
|---|---|
| Where do I add a table? | In the service that owns it, as a new migration in `src/main/resources/db/migration`. |
| Where do I add a REST endpoint? | `presentation/rest` (controller) + `application/<feature>` (request, response, handler). |
| Service A needs data from B? | Add a contract in `contracts/proto/webblock/B/`, B implements it in `presentation/grpc`, A calls it from `infrastructure/client`. |
| Tell other services something happened? | New event schema in `contracts/events/<sender>/`, sender uses outbox, consumers use inbox. |
| Where do shared helpers go? | Not a shared class. A contract, or `commons/` (auth, errors, trace headers only). |
| Which service owns the Product catalog? | `project-service` (there is no catalog-service). |
