---
name: change-contract
description: Change an existing WebBlock service contract (proto RPC/message or RabbitMQ event schema) without breaking other services - decides additive vs breaking, creates v2 when needed, lists every consumer, updates CATALOG.md and the rollout order. Use whenever a field, RPC, event or shared status value changes.
argument-hint: "[contract file or name + what you want to change]"
---
# Change a contract: $ARGUMENTS

Read first: `.claude/rules/contracts.md` and `cross-service-change.md`. Then `contracts/CATALOG.md`.

## 1. Find who is affected (evidence, not memory)
```bash
grep -rn "<MessageName>\|<rpc_name>\|<message_type>" services contracts --include=*.java --include=*.py --include=*.proto --include=*.json --include=*.yml
```
List: owner service · every consumer found · every consumer the CATALOG lists that the grep did not find (maybe not built yet).

## 2. Classify the change
| Change | Class | Action |
|---|---|---|
| New optional field with a new number / new optional JSON property | additive | edit v1 |
| New RPC, new message, new event file | additive | edit v1 / add file |
| New enum value | additive **if** consumers treat unknown values safely | check each consumer's handling first |
| Rename, renumber, remove, retype, change meaning, make required | **breaking** | create v2, keep v1 |
Say the class out loud to the user before editing. If it is breaking, show the v2 plan and wait for the user's OK.

## 3. Additive path
1. Edit only the owner's file. New number = next unused; never reuse a removed number (`reserved`).
2. Update `contracts/CATALOG.md` (and `contracts/README.md` only if rules changed).
3. Owner code: serve/publish the new thing. Consumers keep working untouched.
4. Tests: owner contract test; add one consumer test only for consumers that start using it.
5. Compile: `protoc` (all protos) / `python -m json.tool` (events).

## 4. Breaking path (v2 next to v1)
1. Copy the file to the v2 package: `proto/webblock/<owner>/v2/...` (`package webblock.<owner>.v2`), or `<event>.v2.schema.json` with routing key `<event>.v2`.
2. Owner serves/publishes **both** v1 and v2 during the overlap. Mark v1 `deprecated` in the CATALOG with a retire date set by the user.
3. Consumers move one at a time, each its own small change + tests. Never switch two services in one commit.
4. When the last consumer has moved (check the grep again), remove v1 in its own commit.
5. During the overlap, old sender + new receiver and new sender + old receiver must both work. Write what happens in each case.

## 5. Shared status values and error codes
A status string from `status-flows.md` or an error `code` is also a contract. Changing one is breaking. New statuses need team approval (hard rule 3):
ask, do not add.

## 6. Definition of done
- [ ] Class stated (additive / breaking) and consumers listed
- [ ] Contract + CATALOG updated, compile/validate output shown
- [ ] Owner tests pass; each touched consumer's tests pass (commands + results shown)
- [ ] Rollout order written (owner first, then each consumer, then retire v1)
- [ ] Nothing else changed (no drive-by refactors)
