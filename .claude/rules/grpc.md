---
paths:
  - "contracts/proto/**"
  - "services/**/presentation/grpc/**"
  - "services/**/infrastructure/client/**"
  - "**/*Grpc*.java"
  - "**/*grpc*.py"
---
# gRPC: service to service (Notion section 3)

Use gRPC when a service needs an answer **now** from another service. Only inside the cluster, always through Istio
(mTLS encrypts it and proves which service is calling). Browsers and the mobile app never speak gRPC: they use REST.

## Status of the move (read this!)
The repo's older rule (`microservice-boundaries.md`) says OpenFeign. The Notion page (27 Oct 2026) says gRPC and lists
"move internal REST calls to gRPC one by one, starting with `CheckAccess`" as open point 5. So:
- **New** service-to-service queries: define a gRPC contract in `contracts/proto/` first. Ask the user if unsure.
- **Existing** Feign clients stay until they are replaced one at a time. Do not mix both styles for the same call.
- Never invent a third way (raw RestTemplate, hard-coded URLs).

## Server side (the service that GIVES)
- Code lives in `presentation/grpc/<feature>/`: `XGrpcService` (extends the generated `...ImplBase`) and `XGrpcMapper`.
  It only maps proto <-> request/response and calls ONE handler in `application/`. No business logic, no repository.
- Port `9090`, Kubernetes Service port named `grpc`, e.g. `project.webblock.svc:9090`.
- Who may call a method is decided by an Istio `AuthorizationPolicy`, one rule per method, naming the caller's service
  account (page 3.8). When you add a method, add its rule; a service with several processes lists exactly the ones that call.
- Take the user from metadata `x-user-id`. Never accept `x-user-id` from a caller that is not on the method's allow list.
- Unknown resource in an "is this allowed?" question answers `allowed = false`, not `NOT_FOUND` (do not leak what exists).

## Client side (the service that NEEDS)
- Code lives in `infrastructure/client/` (Java: `PaymentGrpcClient`; Python: a small client class in `infrastructure/`).
- Resolve the target by **name** (`project`, `payment`, `account`), never `localhost:port` or a cluster URL in code.
  The address comes from config: local Eureka/static, `k8s` profile -> Kubernetes DNS.
- **Every call sets a deadline.** Default 2 seconds; longer only with a comment saying why (e.g. 10 s for a big download).
- **Retry only on `UNAVAILABLE`**, at most 2 times, short wait, and only if the call is safe to repeat
  (a read, or a write that carries an `idempotency_key`).
- **Fail closed:** no answer in time = the caller says no ("not allowed"), never yes.
- Add a circuit breaker (Resilience4j / equivalent) where the dependency can fail for long.
- Map a gRPC error to the caller's own REST error, keeping `reason` as the REST `code`.

## Metadata every call sends (page 3.5)
| Key | Meaning |
|---|---|
| `x-user-id` | The signed-in user's `user_id`, when there is one. **Never the token.** |
| `x-request-id` | Request ID from the first service in the chain. Pass it on unchanged. |
| `traceparent` | Trace ID for Tempo. `web-block-commons` passes it on. |
These go only to our own services, never to outside hosts (Knock, Keycloak admin, LLM, Gitea, Jenkins, Webill).

## Errors
- Status code from the table in `rest-response-format.md` section "Which status for which error".
- Always attach `google.rpc.ErrorInfo`: `reason` = the same stable code as REST (`PROJECT_NOT_FOUND`), `domain` = `project.webblock`,
  `metadata.request_id`. Validation errors add `BadRequest` with one `field_violation` per field.
- `message` is the same short sentence as REST `title`. Never echo what the caller sent. No stack traces, SQL, paths.

## Contract rules
Everything in `contracts.md` applies. In short: add only, never rename/renumber/remove in v1; update `CATALOG.md`; consumer
generates its own stubs.

## Tests
- Server: unit-test the handler; test the gRPC service with an in-process server (`grpc-testing`/`InProcessServerBuilder`).
- Client: fake the server (in-process) and assert the deadline, the retry-on-UNAVAILABLE and the fail-closed behaviour.
- Do not call real other services in tests.
