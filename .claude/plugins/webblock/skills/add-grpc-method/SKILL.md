---
name: add-grpc-method
description: Add a gRPC method between two WebBlock services the safe way: contract first in contracts/proto, then the server in the owner service, then the client in the caller, with deadlines, fail-closed behaviour, Istio allow rule and tests. Use when one service must ask another a question and wait for the answer.
argument-hint: "[<owner-service>.<Service>/<Method>  called by  <caller-service>]"
---
# Add a gRPC method: $ARGUMENTS

Read first: `.claude/rules/grpc.md`, `contracts.md`, `cross-service-change.md`, `auth-tokens.md`, `contracts/CATALOG.md`.
Nothing here is optional. If the gRPC library for Java/Python has not been chosen yet, STOP and ask the user (the
shared `commons/` design is still in review) — do not pick one silently.

## 0. Is gRPC the right tool?
- Need an answer now (a permission check, a lookup)? gRPC. Telling others something happened? Use an event (`add-rabbit-event`).
- Is this call already forbidden? (AI -> Provisioning/Payment, Notification deciding, call loops: Notion 5.5.) Then stop and say so.
- Does the same data already exist in a contract? Reuse it.

## 1. Contract first (owner service's folder only)
1. File: `contracts/proto/webblock/<owner>/v1/<topic>.proto`. Header with `OWNER:`; `package webblock.<owner>.v1;`;
   `option java_package = "org.kshrd.webblock.contracts.<owner>.v1"; option java_multiple_files = true;`.
2. Service name ends in `Service`; method is Verb+Noun; messages `<Method>Request/Response`; fields `snake_case`.
3. Put `user_id` as a request field when the answer depends on a user (it comes from `x-user-id`, never the token).
4. Retryable write? Add `idempotency_key`. Unknown resource in an "allowed?" question answers `allowed = false`, not NOT_FOUND.
5. Compile it: `cd contracts/proto && protoc -I . -I <protobuf-include> --descriptor_set_out=/dev/null $(find webblock -name '*.proto')`.
6. Add a row to `contracts/CATALOG.md` (owner, consumers, why, status `planned`).
   If you edit an existing committed file, additive changes only (the `protect-contracts` hook enforces it).

## 2. Server (owner service, e.g. `services/project-service`)
1. `presentation/grpc/<feature>/XGrpcService` extends the generated `...ImplBase`; `XGrpcMapper` maps proto <-> request/response records.
2. It calls ONE handler in `application/<feature>/handler`. No business logic, no repository in the gRPC class.
3. Read `x-user-id` from metadata only when the caller is allowed (Istio policy). Never read a token here.
4. Map exceptions to gRPC status + `ErrorInfo.reason` = the same stable code as REST (`rest-response-format.md`).
5. Add the Istio `AuthorizationPolicy` rule for the method naming the caller's service account (page 3.8). If infra is not in this repo,
   write the rule text in your answer so the infra owner can add it.
6. Port `9090`, port name `grpc` in the Kubernetes Service (note in answer if the manifest is elsewhere).

## 3. Client (caller service, e.g. `services/provisioning-service`)
1. `infrastructure/client/<Owner>GrpcClient` (Java) or `infrastructure/<owner>/client.py` (Python, implements a port from `application/ports`).
2. Target by service NAME from config (local vs `k8s` profile). No `localhost:port` in code (the `boundary-guard` hook warns).
3. **Deadline on every call** (default 2 s). **Retry only `UNAVAILABLE`**, max 2, only for safe-to-repeat calls.
4. **Fail closed**: timeout/unavailable -> "not allowed" / "not admitted", never "allowed". Circuit breaker where it can fail long.
5. Send metadata: `x-user-id`, `x-request-id`, `traceparent`. Never the token.
6. Map the gRPC error back to the caller's own REST error keeping `reason` as `code`.
7. Replacing an existing Feign client? Use the `feign-to-grpc` skill so you migrate one call at a time.

## 4. Tests (both sides, no real other service)
- Owner: handler unit test (both branches), gRPC service test with an in-process server: allowed, not allowed, unknown id, bad argument.
- Caller: fake server; assert deadline set, retry once on UNAVAILABLE then fail closed, no retry on NOT_FOUND/INVALID_ARGUMENT, metadata sent.
- Run that service's tests (`./gradlew test` / `python -m pytest`) and show the result.

## 5. Report (short, simple English)
Contract file + CATALOG row · owner change · caller change · Istio rule text · test results · what is NOT done (other consumers, v2 plan).
