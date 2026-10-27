---
paths:
  - "contracts/**"
---
# Contracts (`contracts/`)

`contracts/` is where services write down how they talk to each other. It is the ONLY thing services share
besides the small `commons/` library. Read `contracts/README.md` and `contracts/CATALOG.md` before editing.

## Ownership
- `contracts/proto/webblock/<service>/` and `contracts/events/<service>/` belong to that service. The header
  of each file says `OWNER:`. Only that service's team changes it. Everyone else reads it.
- If you need something from another service, do NOT edit its contract. Open a request (issue / PR comment /
  ask the user) describing the question you need answered. The owner decides and adds it.
- Never copy generated classes of another service into your code. Generate your own client from the `.proto`
  (or write your own small DTO for an event). Your DTO may ignore fields it does not use.

## The versioning rules (these protect running systems)
1. **v1 is frozen in shape.** Allowed: add a new RPC, a new message, a new optional field with a NEW number, a new enum value
   (consumers must treat unknown values safely), a new event file.
2. **Not allowed in v1:** rename a field, change its number, change its type, remove a field or RPC, change what a field means,
   make an optional field required. The `protect-contracts` hook blocks the number/removal cases; the rest is on you and the reviewer.
3. A breaking change = new package `v2` next to `v1`. Run both until every consumer moved, then stop `v1`
   (page 3.1 and 4.5). Record the dates in `CATALOG.md`.
4. Removed field numbers are never reused: write `reserved 4;` / `reserved "old_name";`.
5. Package is `webblock.<service>.v1`, Java package `org.kshrd.webblock.contracts.<service>.v1`.

## Naming
| Thing | Rule | Example |
|---|---|---|
| gRPC service | what it offers, ends in `Service` | `AccessService` |
| RPC | Verb + Noun | `CheckAccess`, `GetRepository` |
| Messages | `<Rpc>Request` / `<Rpc>Response` | `CheckAccessRequest` |
| Proto fields | `snake_case` | `project_id` |
| Event `message_type` | `<service>.<event>.v<N>` | `project.source_published.v1` |
| Event field names | `snake_case` | `generation_request_id` |

## What goes in a contract (and what never does)
- IDs and small values only. A big file travels through object storage as a short-lived presigned link + SHA-256.
- Never personal data in events (no email, name, phone). A gRPC reply may carry an email only when the caller must send mail
  (`GetUserContact`); the caller must not log it.
- Never tokens, passwords, OTPs, KHQR data, bank account numbers, secrets.
- Status-like strings use the exact values from `docs/specs/status-flows.md`. No new statuses without team approval (hard rule 3).
- Failure text is sanitized (`failure_code`, `failure_summary`): no stack trace, SQL, file path, secret.
- Anything that can be retried carries an `idempotency_key` or a stable `event_key` (business rule 26).
- Version counters (`status_version`, `command_number`) only go up; the consumer drops older ones (rule 27).
- Time is UTC.

## Every contract change needs these in the SAME pull request
1. The `.proto` / `.schema.json` change.
2. `contracts/CATALOG.md` updated (owner, consumers, status).
3. The owner service's code (server side / publisher).
4. For each consumer: either its code change, or a written note "consumer X will follow in PR Y" and the change is additive.
5. A test: a contract test on the owner side and one on each consumer that changed (see `testing.md`).
Use the `change-contract` skill and the `contract-guardian` agent; `/contract-check` runs the checks.

## Checking
```bash
cd contracts/proto && protoc -I . -I <dir-with-google/protobuf> --descriptor_set_out=/dev/null $(find webblock -name '*.proto')
cd contracts && buf lint && buf breaking --against '.git#branch=main,subdir=contracts'    # when buf is installed
python -m json.tool contracts/events/<service>/<event>.v1.schema.json                     # event schemas must stay valid JSON
```
