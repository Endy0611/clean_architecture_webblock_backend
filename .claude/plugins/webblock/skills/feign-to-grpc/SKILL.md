---
name: feign-to-grpc
description: Migrate one existing OpenFeign (REST) service-to-service call to gRPC without downtime - contract, server, new client behind the same interface, switch by config, then remove the Feign client. Use for open point 5 of the architecture page, one call at a time.
argument-hint: "[caller-service -> target-service : client method]"
---
# Migrate one call from Feign to gRPC: $ARGUMENTS

Read first: `grpc.md`, `cross-service-change.md`, `microservice-boundaries.md`. **One call per run.** Start with `CheckAccess` (Project) as the page suggests.

## Steps
1. **Find it.** `grep -rn "@FeignClient" services/<caller>`; list every use of the method (handlers, tests). Show the current REST path, DTOs and error handling.
2. **Contract.** Add the RPC to `contracts/proto/webblock/<target>/v1/` (use `add-grpc-method` step 1). Mirror the REST DTO fields; do not copy the target's classes.
3. **Server.** In the target add `presentation/grpc/...` calling the SAME handler the REST endpoint uses (one rule, two doors). Keep the REST endpoint until the end.
4. **Client behind an interface.** In the caller, the code should depend on an interface (a small port) with two implementations:
   the existing Feign one and the new gRPC one. Pick with a property, e.g. `webblock.clients.<target>.transport: feign|grpc` (default `feign`).
5. **Prove equal behaviour.** Same inputs -> same decisions in both implementations (parameterized test). Check the error mapping, the deadline and fail-closed.
6. **Switch locally**, run both services' tests, then flip the default to `grpc` in its own commit.
7. **Remove** the Feign client and, if nothing else uses it, the internal REST endpoint, each in its own commit. Update `CATALOG.md` status to `live`.
8. Leave `application-k8s.yml` consistent (target name/address for the gRPC channel).

## Do not
- Change two calls in one commit. Break the REST endpoint before every caller moved. Hard-code a gRPC address. Drop timeouts.

## Report
Before/after path of the call · the config flag · tests · what is left (next call to migrate).
