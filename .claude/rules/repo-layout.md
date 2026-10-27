# Repo layout and who owns what (always on)

Read this first when you are not sure where something belongs. It is the map of the whole backend repo.
Sources: `CLAUDE.md`, Notion "Web Block architecture" (sections 1, 5, 6), `docs/specs/*`.

## Top level

```
Webblock_Backend/
├── services/                  ← every deployable service, one folder each (own build, own database)
│   ├── api-gateway/             Spring Cloud Gateway, LOCAL ONLY (routing only, no business logic)
│   ├── discovery-service/       Eureka server, LOCAL ONLY
│   ├── user-service/            = "Account" in the specs. Users, login session, profile
│   ├── project-service/         Projects, pages, catalog, subdomain, Git repository, edit revision
│   ├── payment-service/         Plans, prices, trial, bills (WeBill KHQR), subscriptions
│   ├── notification-service/    Alerts (Knock + email). Decides nothing
│   ├── provisioning-service/    Python/FastAPI. Releases, deploys, hosting, routing
│   └── webblock-aicode-service/ the AI service (FastAPI + Next.js harness). Its OWN git repo and its OWN CLAUDE.md/.claude.
│                                  Plays the role of "ai-generator-service" / "AI Codegen" (keeps its own folder layout)
├── contracts/                 ← the agreements between services: proto/ (gRPC) and events/ (RabbitMQ)
├── commons/                   ← shared helper library (design in review, no code yet): java/ and python/
├── config-repo/               ← per-profile YAML placeholders (no config server yet)
├── scripts/                   ← gradle-all.sh and other helpers
├── docs/specs/                ← feature-detail, business-rules, data-dictionary, status-flows, workflow, open-questions
├── .claude/                   ← rules, skills, agents, commands, hooks for Claude Code (this setup)

Not in this repo: `apps/web`, `apps/mobile`, `packages/puck-blocks`, `templates/site-template`, `infra/`, Helm charts.

## Names: the same service has several names

| Folder | Spec / Notion name | API prefix | Port | Language |
|---|---|---|---|---|
| `services/user-service` | Account (`account-service`) | `/api/user/v1` | 8081 | Java |
| `services/project-service` | Project (+ catalog) | `/api/project/v1` | 8082 | Java |
| `services/payment-service` | Payment | `/api/payment/v1` | 8083 | Java |
| `services/notification-service` | Notification | `/api/notification/v1` | 8084 | Java |
| `services/provisioning-service` | Provisioning | `/api/provisioning/v1` | 8085 | Python |
| `services/webblock-aicode-service` | AI / AI Codegen (`ai-generator-service`) | `/api/ai-generator/v1` | 8086 | Python |
| `services/api-gateway` | — | — | 8080 | Java |
| `services/discovery-service` | — | — | 8761 | Java |

The folder name is what `@FeignClient(name=...)`, `spring.application.name` and Kubernetes Service names use.

## What each service owns, gives and needs

Use this to decide where a feature belongs. Detail and status of every contract: `contracts/CATALOG.md`.

| Service | Owns (tables) | Gives (others call it) | Needs (it calls) | Sends events | Listens to events |
|---|---|---|---|---|---|
| user-service | `account_*` | owner contact, signup time | — | `user_status_changed` | — |
| project-service | `project_*`, `catalog_*` | `CheckAccess`, codegen input, scaffold, repository, project owner, thread owner | Payment (admission, entitlement), AI (run result), Gitea | `generation_requested/cancelled`, `source_published`, `project_deleted`, `owner_status_changed` | `generation_completed`, `user_status_changed` |
| payment-service | `payment_*` | admission, entitlement | Account (signup time), WeBill | `hosting_entitlement_ended/restored`, `bill_paid`, `subscription_activated` | `source_published`, `project_deleted`, `publish_completed`, `user_status_changed` |
| notification-service | none (Knock only) | Alertmanager webhook | Account (contact), Project (owner), Knock, Keycloak (admin list) | — | `source_published`, `publish_completed`, `hosting_entitlement_ended` |
| provisioning-service | `provisioning_*` | REST `/v1` (deploy, redeploy, suspend, rollback) | Project (`CheckAccess`, repository), Payment (entitlement), Jenkins, Kubernetes | `publish_completed` | `source_published`, `project_deleted`, `owner_status_changed`, `hosting_entitlement_*` |
| AI (webblock-aicode-service) | `ai_codegen_*`, `ai_assistant_*` | design-assistant REST, run result | Project (codegen input, scaffold, thread owner), GLM/LLM | `generation_completed` | `generation_requested/cancelled` |

## Where does a new thing go?

| You are adding... | It goes in... |
|---|---|
| A table or column | the service that owns it (data dictionary says which) — a new Flyway/Alembic migration |
| A call from service A to service B | A's `infrastructure/client`; the contract in `contracts/proto/<B>/`; B's `presentation/grpc` |
| "Tell the others that X happened" | `contracts/events/<sender>/`; sender's outbox + `infrastructure/messaging`; each consumer's `presentation/messaging` |
| A rule that two services both need | one service owns it; the other asks (never copy the rule) |
| Code that two services both need | NOT a shared class. Either a contract, or `commons/` (only auth, errors, trace headers) |
| A new service | `services/<name>-service`, then run the `new-spring-service` skill; add it to this file, `CLAUDE.md`, the gateway and `contracts/CATALOG.md` |

## Hard boundaries (copy of the rules that must never be broken)

1. One service, one database. Never query another service's tables.
2. No compile-time coupling: never add another service as a dependency or copy its entity classes.
3. Same public path locally (gateway) and on Kubernetes (Istio): `/api/<service>/v1/**`.
4. Business Portal (owner) and Admin Portal (admin) stay separate.
5. AI never calls Provisioning or Payment. Notification never decides. Nobody calls the frontend.

Related: `microservice-boundaries.md`, `contracts.md`, `cross-service-change.md`, `java-layout.md`, `python-layout.md`.
