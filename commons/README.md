# commons/ — web-block-commons (design in review)

One small library so every service handles users, errors and trace headers the same way.
Status: **folder reserved, no code yet.** Source: Notion "Web Block architecture" section 8 (marked "design in review").
Do not start writing code here until the team approves the design and answers the open points below.

```
commons/
├── java/      ← Spring Boot starter (user-service, project-service, payment-service, notification-service)
└── python/    ← Python package (provisioning-service, ai-generator-service / webblock-aicode-service)
```

## What it will do

| Job | Detail |
|---|---|
| Check the token in the first service | Keycloak key set, RS256 only, issuer, **its own audience**, `typ` Bearer, `exp`/`nbf`. Any failure is 401 |
| Give each endpoint the current user | `user_id`, `roles`, "is admin" |
| One-liners to protect an endpoint | signed-in user · admin only (403) · owner/admin of a project (404 when not the owner) · owner of a local record (404) · allowed callers only for internal methods (403) |
| Calls from other services | takes `x-user-id` only from callers on the method's allowed list (mTLS identity) |
| Calls to our own services | adds `x-user-id`, `x-request-id`, `traceparent`. **Never the token**, never to outside hosts (Knock, Keycloak admin, the LLM, Gitea, Jenkins, Webill) |
| Errors | REST: RFC 9457 `application/problem+json`; gRPC: status + `ErrorInfo` (same code as REST) |
| Telemetry glue | passes `traceparent`/`x-request-id` on, puts both in RabbitMQ headers, JSON logs with `trace_id`, `span_id`, `request_id`. Never logs a token |

## Why a library and not copy-paste

Every service validates the JWT itself (`.claude/rules/security.md`). If five services each write that check
by hand, one of them will get it wrong. One library = one place to fix.

## What stays OUT of commons

- Business logic, entities, DTOs of any service (that would be compile-time coupling between services).
- The contracts (`contracts/` is separate: it is the agreement, commons is the helper code).

## Open points before coding starts

1. Token claims: the page uses top-level `user_id` + `roles` (audience per service); `.claude/rules/security.md` still says `jwt.sub` + Keycloak `admin` realm role. See `docs/specs/open-questions.md`.
2. Distribution: the page says GitLab Package Registry with one version number. In this monorepo it can start as a Gradle `includeBuild` + a pip editable install.
3. The mTLS identity (`x-user-id` accepted only from allowed callers) needs Istio, which is not available locally. Local runs need a stand-in.
