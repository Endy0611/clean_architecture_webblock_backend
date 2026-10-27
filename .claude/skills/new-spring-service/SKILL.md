---
name: new-spring-service
description: Scaffold a new WebBlock Spring Boot microservice (Gradle, layered packages, Flyway, Keycloak JWT, actuator, Eureka for local + k8s profile, Testcontainers, Dockerfile). Use when the user asks to create or bootstrap a Java service.
argument-hint: "[service-name]"
disable-model-invocation: true
---
# New Spring Boot service: $ARGUMENTS

1. Confirm the name matches a planned service (see the name table in `CLAUDE.md`) or ask why a
   new one is needed. Folder = `services/$ARGUMENTS-service/`.
2. Copy the Gradle skeleton from `services/user-service` (`build.gradle`, `settings.gradle`, `gradlew*`,
   `gradle/wrapper/*`; not `build/`, `.gradle/`, `src/`, `*.iml`). Groovy DSL, same versions:
   Boot plugin `4.1.1`, dependency-management `1.1.7`, `springCloudVersion = 2025.1.3`, Java 21,
   `group = 'org.kshrd.webblock'`.
3. Dependencies (no explicit versions on Boot/Cloud artifacts): webmvc, validation, data-jpa,
   security + oauth2-resource-server, actuator, micrometer-registry-prometheus, flyway +
   flyway-database-postgresql, postgresql, spring-cloud-starter-netflix-eureka-client,
   spring-cloud-starter-openfeign (+ `@EnableFeignClients` on the application class),
   `org.springdoc:springdoc-openapi-starter-webmvc-ui:${springdocVersion}` (`springdocVersion = 3.1.1`
   in `ext`, plus a `config/OpenApiConfig` with `@OpenAPIDefinition`);
   test: spring-boot-starter-test, testcontainers postgresql.
4. Packages `org.kshrd.webblock.<name>.{presentation/{rest,grpc,messaging},application,domain,infrastructure/{persistence,messaging,client,config,security},common/{presentation,domain}}`
   as in `.claude/rules/java-layout.md` (empty folders get a `.gitkeep`). `OpenApiConfig` goes in `infrastructure/config`.
5. `application.yml` (local): `spring.application.name: $ARGUMENTS-service`, `server.port` from the
   CLAUDE.md table, `${DB_URL}`/`${DB_USER}`/`${DB_PASSWORD}`/`${KEYCLOAK_ISSUER_URI}` placeholders,
   Eureka `defaultZone: ${EUREKA_URL:http://localhost:8761/eureka/}`, actuator `health,prometheus`.
6. `application-k8s.yml`: `eureka.client.enabled: false` + simple discovery instances for every
   service it calls (see `microservice-boundaries.md`).
7. `SecurityConfig` in `infrastructure/security` (JWT resource server; `/actuator/health` open; `/api/<name>/v1/admin/**` → role `admin`),
   `GlobalExceptionHandler` in `common/presentation` → `ProblemDetail` with `code`, empty `db/migration/`,
   one `@SpringBootTest` smoke test with Testcontainers and `eureka.client.enabled=false`.
8. Multi-stage `Dockerfile` (non-root, healthcheck).
9. Add the route `/api/<name>/v1/**` → `lb://$ARGUMENTS-service` to `api-gateway`, and note that the
   Istio VirtualService needs the same path.
10. Add the service to the tables in `CLAUDE.md` (and `docker-compose.yml` once it exists).
11. Run `./gradlew build` in the new folder and show the result.
