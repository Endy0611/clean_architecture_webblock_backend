# contracts/ — how WebBlock services agree with each other

Services never share code or databases. They share **these files only**. If you want to know what another
service gives you, read its folder here. If you change what your service gives, change the file here first.

Source: Notion "Web Block architecture" (sections 3, 4, 5). Rules for Claude and humans:
`.claude/rules/contracts.md`, `grpc.md`, `rabbitmq-events.md`, `cross-service-change.md`.
The full list of who gives what to whom: [`CATALOG.md`](CATALOG.md).

## Layout

```
contracts/
├── CATALOG.md                              ← the map: every contract, its owner, its consumers
├── buf.yaml                                ← lint + "no breaking change" settings for proto/
├── proto/webblock/<service>/v1/*.proto     ← gRPC: "ask and wait for the answer"
│     project/  payment/  account/  ai_codegen/      (one folder per service that GIVES)
└── events/
    ├── envelope.v1.schema.json             ← fields every event has
    └── <service>/<event>.v1.schema.json    ← RabbitMQ: "this happened" (one folder per service that SENDS)
          account/  project/  ai_codegen/  provisioning/  payment/
```

## Three ways to talk (pick by the question)

| You want to | Use | Contract lives in |
|---|---|---|
| Serve the browser / mobile app / frontend | REST (JSON) | each service's Swagger (not here) |
| Ask another service something and wait | gRPC (inside the cluster only) | `proto/` |
| Say "this happened" or start long work | RabbitMQ event | `events/` |

## Ownership (the one rule)

- A folder is **owned by the service whose name it carries**. Only that service's team edits it.
- Every other service **reads** it and generates its own client/DTO. Never copy another service's classes or entities.
- A change to a contract is a change to every consumer. Follow `.claude/rules/cross-service-change.md`.

## How to change a contract safely

| Change | Allowed in `v1`? | What to do |
|---|---|---|
| Add a new RPC / message / optional field (new number) | Yes | Add it, update `CATALOG.md`, tell consumers |
| Rename, renumber, remove a field; change a type; remove an RPC | **No** | Create `v2` next to `v1`, keep both until every consumer moved, then stop `v1` |
| Add a new event | Yes | New file `<event>.v1.schema.json`, add its queue in the consumer, update `CATALOG.md` |
| Change the meaning of a field | **No** (a silent break) | Treat like a rename: new version |

Protobuf field numbers are the wire format. The `protect-contracts` hook blocks edits that change or remove one.

## Checking your change

```bash
# compile every .proto (needs protoc; pass the include dir that holds google/protobuf/*.proto)
cd contracts/proto && protoc -I . --descriptor_set_out=/dev/null $(find webblock -name '*.proto')
# with buf installed (preferred, also checks "breaking" against main):
cd contracts && buf lint && buf breaking --against '.git#branch=main,subdir=contracts'
```
Event schemas are JSON Schema 2020-12; keep them valid JSON (`python -m json.tool <file>`).

## Rules for contract content

- IDs and small values only. No personal data, no tokens, no passwords, no big files (use a presigned link + SHA-256).
- Enum-like values use the exact strings from `docs/specs/status-flows.md`. No new statuses without team approval.
- Failure fields (`failure_code`, `failure_summary`) are sanitized text: no stack trace, SQL, file path or secret.
- Retryable writes carry an `idempotency_key` / `event_key`.
- Times are UTC (`google.protobuf.Timestamp` or ISO-8601 `date-time`).
- Event field names are `snake_case`; REST field names are `camelCase`; protobuf fields are `snake_case`.
