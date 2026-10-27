# Changing something that other services know about (always on)

The goal of this repo's structure is that **when one service changes, every service that depends on it finds out
from a file, not from a production error.** This rule says how.

## First question: who else knows this?
Before you change any of these, stop and look who uses it (`contracts/CATALOG.md`, then grep the other services):
- a `.proto` message or RPC, an event schema, an event routing key, an exchange or queue name
- a REST path, a request/response field, an error `code`, a status value
- an enum value from `docs/specs/status-flows.md`
- a database column that another service gets through an API or event (the column itself is private to the owner)
- an `x-user-id` / `traceparent` / token-claim convention, an `aud` value

If another service uses it, it is a **cross-service change**. If you are not sure, treat it as one.

## The protocol
1. **Say it out loud.** Tell the user: which service owns it, which services consume it, is it additive or breaking.
2. **Additive?** (new optional field, new RPC, new event, new enum value consumers can ignore)
   - Change the contract file, `contracts/CATALOG.md`, the owner's code, and tests. Consumers keep working unchanged.
   - Tell the user which consumers could start using it.
3. **Breaking?** (rename, remove, retype, renumber, change meaning, make required)
   - Do NOT edit `v1`. Create `v2` next to it. Owner serves both. Consumers move one by one. Then retire `v1`.
   - Write the rollout order in the answer (owner first, then consumers) and what happens during the overlap.
4. **One service per change.** Make the owner's change and stop. Make each consumer's change as its own small step, running
   that service's tests each time. (CLAUDE.md: "Small changes, one service at a time.")
5. **Backward compatible during rollout.** In Kubernetes services deploy at different times. New sender + old receiver
   and old sender + new receiver must both work for the overlap.
6. **Update the docs in the same change:** `contracts/CATALOG.md`; `docs/specs/*` only if the team approves a rule change;
   `.claude/rules/repo-layout.md` if ownership moved.
7. **Prove it.** Contract test on the owner; a test on each changed consumer; `protoc`/`buf` compile; show the output.

## What you must not do
- Change another service's contract file because you "just need one field". Ask the owner (the user will route it).
- Copy another service's entity/DTO into yours to avoid waiting.
- Query another service's database "just for now".
- Hard-code another service's URL or port.
- Add a shortcut call that creates a loop (A asks B inside a request while B asks A).
- Make AI call Provisioning/Payment, or Notification decide something (Notion 5.5).

## Quick decision table
| I want to... | Do this |
|---|---|
| Know if a user may do X to a project | gRPC `AccessService.CheckAccess` on Project |
| Know if hosting is paid | gRPC `EntitlementService.GetEntitlement` on Payment |
| Tell others a site's code is ready | Project publishes event `source_published.v1` |
| Show a bell/alert to an owner | publish the domain event; Notification listens (never call Notification from the request path) |
| Show data from another service in my UI/API | ask its REST/gRPC API, or keep a small read copy filled by its events (never read its DB) |

## Review checklist (used by the `contract-guardian` agent and `/sync-check`)
- [ ] Contract file changed only by its owner service's work
- [ ] No field renamed/renumbered/removed in v1
- [ ] `CATALOG.md` matches the files
- [ ] Every consumer listed in `CATALOG.md` still compiles / has a note
- [ ] Idempotency key / `event_key` present for retryable writes
- [ ] Errors use the shared codes and carry no secrets
- [ ] Tests added on both sides
