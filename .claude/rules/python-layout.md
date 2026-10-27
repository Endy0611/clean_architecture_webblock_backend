---
paths:
  - "services/provisioning-service/**"
---
# Python layout: provisioning-service (Notion section 6.2)

The Python service uses the same four layers as Java, with ONE arrow different (owner decision, 27 Oct 2026):

```
Java:    presentation -> application -> infrastructure          (handlers use the Spring Data repository directly)
Python:  presentation -> application -> domain
         infrastructure -> application (implements the ports application defines)  and  infrastructure -> domain
```
So in Python **`application` imports only `domain`**; `infrastructure` implements the interfaces (ports) that `application`
defines. This keeps the core testable with in-memory fakes and no database. `import-linter` checks it — keep its config current.

## Layout
```
services/provisioning-service/src/provisioning/
├── core
│   ├── domain             state machine, models, rules; imports nothing of ours
│   └── application
│       ├── shared         errors, user, action names, audit; used by every feature
│       ├── ports          interfaces to outside systems: Project, Payment, Jenkins, cluster, metrics
│       └── <feature>      operations, commands, intake, builds, deploys, routing, hosting, reconcile, usage, tenants:
│                          the use case, its store port, its executor and loop
├── presentation
│   ├── http               REST /v1 for the frontend, health and metrics
│   ├── mcp                admin tools for the team
│   ├── operations         the operation table REST and MCP share
│   └── messaging          our message formats; consumers/ holds the RabbitMQ listeners
├── infrastructure         one folder per outside system
│   ├── postgres           our stores (implement the store ports)
│   ├── rabbitmq           broker client, queue setup, dead letters
│   ├── project, payment, grpc     gRPC clients (implement the ports)
│   └── kubernetes, jenkins, catalog, identity, telemetry, config, standins
└── hosts                  one folder per process: api, worker, build_worker, bootstrap, operator
    ├── shared             start-up code the processes share
    └── devtools           prototype tools, never in the image
```
Today the folder only has a placeholder. When code arrives, create this tree; do not invent another one.

## Rules
1. `domain` imports nothing of ours. `application` imports only `domain`. `presentation` calls `application`.
2. Only `hosts/*` connect real adapters to use cases (dependency wiring happens there, nowhere else).
3. A new outside system = a port in `application/ports` + an adapter folder in `infrastructure/`.
4. Several processes (`api`, `worker`, `build_worker`) = several Kubernetes service accounts. gRPC allow-lists name the exact ones that call.
5. Long work (build, deploy, rollback) never runs inside an HTTP request: accept the command (`202`), run it in a worker, report by status endpoint and event.
6. Tests: pytest; use the in-memory fakes for ports; no real Jenkins, Kubernetes, Gitea or LLM.

## The other Python service
`services/webblock-aicode-service` keeps its **own** layout (its AI harness is different; see its own `CLAUDE.md`). It still follows
the same API, gRPC and RabbitMQ rules (`rest-response-format.md`, `grpc.md`, `rabbitmq-events.md`) and the same security rules.
Do not reshape it to match this tree.
