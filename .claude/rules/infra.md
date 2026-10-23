---
paths:
  - "infra/**"
  - "docker-compose*.yml"
  - "**/Dockerfile"
  - "**/Jenkinsfile"
---
# Infrastructure

- Local: root `docker-compose.yml` runs Postgres (one DB per service), Redis, Keycloak, Gitea, Ollama, and the services.
- Images: multi-stage builds, non-root user, pinned base image versions, healthchecks. Built with Kaniko in CI, pushed to Harbor.
- Kubernetes: one namespace per generated site; resource requests/limits from the plan; NetworkPolicy deny-by-default.
- On Kubernetes, Istio is the API gateway (JWT checked at the gateway and again in the service) and
  services find each other through Service DNS. `api-gateway` and `discovery-service` are local-only:
  never deploy them to the cluster. Services run with `SPRING_PROFILES_ACTIVE=k8s`
  (Python: `EUREKA_ENABLED=false`).
- Keep the Istio VirtualService paths identical to the routes in `api-gateway/src/main/resources/application.yml`.
- GitOps with Argo CD: change manifests in Git, don't `kubectl apply` by hand in shared clusters.
- Every service exposes `/actuator/health` and `/actuator/prometheus`; Grafana dashboards live in `infra/monitoring`.
- Never put secrets in manifests or compose files — use `.env` (not committed) / sealed secrets.
