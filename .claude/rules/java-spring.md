---
paths:
  - "**/*.java"
  - "**/*.gradle"
  - "**/application*.yml"
---
# Spring Boot services

- Package layout per service (`com.webblock.<service>`): `controller` → `service` (interfaces) + `service/impl` (implementations, transactions) →
  `repository` (JPA repos); `model/dto` (request/response records), `model/entity` (JPA entities), `exception`, `config`,
  `client` (OpenFeign clients), `constraint` (enums), `util` (reusable helpers, e.g. a UUID type handler).
- Controllers are thin: validate (`@Valid`), map DTO, call one service method. No repository calls in controllers.
- DTOs are Java `record`s. Never return JPA entities from an API.
- Enums match `docs/specs/status-flows.md` exactly (UPPER_CASE). Store as `@Enumerated(EnumType.STRING)`.
- IDs are `UUID`. Times are `Instant` / `OffsetDateTime` mapped to `timestamptz`.
- `@Transactional` only in `service/impl`.
- Errors: one `@RestControllerAdvice` per service returning RFC 7807 `ProblemDetail` with a stable `code`.
- Security: Spring Security OAuth2 Resource Server (Keycloak JWT). Read the user from `jwt.sub`.
- Cross-service calls use **OpenFeign** only: one `@FeignClient(name = "<folder-name>", path = "/api/<service>/v1")`
  interface per target service in `client` (e.g. `UserServiceClient`), with the caller's own DTO records.
  Never a URL in `@FeignClient`; the name is resolved by Eureka locally and by `application-k8s.yml` on Kubernetes.
  When you add a new target service, also add it to that service's `application-k8s.yml`. Timeouts are in
  `spring.cloud.openfeign.client.config`. Never share entity classes between services.
- Retryable writes take an `Idempotency-Key` header and store it (see DD `idempotency_key`).
- Config limits that "can change" (deploy retry = 2, trial days = 14, product limit = 30) live in `application.yml` / DB, never hard-coded.
- Tests: JUnit 5 + AssertJ; `@WebMvcTest` for controllers, Testcontainers PostgreSQL for repositories.
