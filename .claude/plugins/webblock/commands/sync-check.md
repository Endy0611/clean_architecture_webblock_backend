---
description: Check that all services agree with each other - contracts, events, calls, layout - and list what is out of sync
argument-hint: "[service-name | all]"
---
Audit sync for **$ARGUMENTS** (default `all`). Read-only. Show evidence (file:line) for every finding.

1. **Map.** Read `contracts/CATALOG.md` and `.claude/rules/repo-layout.md`.
2. **What each service really does.** For every service under `services/`:
   - gRPC it serves: `grep -rn "ImplBase\|presentation/grpc" services/<svc>/src`
   - calls it makes: `grep -rn "@FeignClient\|GrpcClient\|httpx\|requests\." services/<svc>/src`
   - events it sends/consumes: `grep -rn "RabbitTemplate\|@RabbitListener\|routing\|exchange" services/<svc>/src`
3. **Compare with the catalog.** Report as a table: item · service · in catalog? · contract file exists? · status (planned/live) correct?
   Typical drifts: a Feign call to an endpoint no contract describes; a listener for an event with no schema; an exchange/queue name that differs from
   the naming rule (`<service>.events`, `<consumer>.<event>.v<N>`); an event published without outbox.
4. **Forbidden things.** Another service's package imported; a hard-coded host:port; `@FeignClient(url=...)`; AI -> Provisioning/Payment; a call loop;
   a query on another service's table prefix.
5. **Layout drift.** Each Java service follows `java-layout.md`; Python follows `python-layout.md`. Report folders that still use the old
   `controller/service/model` layout.
6. **Docs drift.** Do `CLAUDE.md` and `repo-layout.md` list the same services and ports as the folders in `services/`?

Output: a short table of drifts (most serious first) and, for each, the owner service and the smallest next step. Finish with the count:
`N drifts (X high, Y medium, Z low)`. Do not fix anything; ask which one to do first.
