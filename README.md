# Agent Orchestrator

An extensible **agentic automation framework** for .NET Core software projects. It
orchestrates autonomous capability agents (Developer, QA, DevOps, Documentation) while
enforcing a strict **human-approval workflow** on every guarded action: agent creation,
activation, permission escalation, and deletion.

> Core guarantee: **an agent can never become Active on its own.** The lifecycle
> `Draft -> Pending Approval -> Approved -> Active -> Retired` is encoded structurally
> in the domain model — the only path into `Active` is through `Agent.Activate()`,
> which is only reachable from `AgentStatus.Approved`, which is only reachable from a
> human-decided `ApprovalRequest`.

## Repository layout

```
AgentOrchestrator.sln          # .NET 8 solution (build: dotnet build / dotnet test)
src/
  Domain/                      # Clean Architecture innermost ring (no external deps)
    AgentOrchestrator.Domain/        # Agent, ApprovalRequest, AuditLogEntry aggregates
  Application/                 # CQRS via MediatR: commands, queries, ports (interfaces)
    AgentOrchestrator.Application/
  Infrastructure/              # Adapters: in-memory persistence, approval notifiers
    AgentOrchestrator.Infrastructure/
  Api/                         # REST API (agent registry, approvals, audit log)
    AgentOrchestrator.Api/
  Agents/                      # One project per capability agent
    AgentOrchestrator.Agents.Abstractions/
    AgentOrchestrator.Agents.Developer/
    AgentOrchestrator.Agents.QA/
    AgentOrchestrator.Agents.DevOps/
    AgentOrchestrator.Agents.Documentation/
tests/                         # JUnit 5 test projects (Domain + Application)
deploy/
  docker/  docker-compose.yml  # Local dev stack (also at repo root)
  k8s/                         # Kubernetes manifests (Deployment/Service/HpaPolicy)
  azure/                       # Azure DevOps pipeline (ACR + App Service)
.github/workflows/ci.yml       # GitHub Actions: build, test, docker build
```

## Architecture

- **Clean Architecture / DDD** with dependency rule enforced by project hierarchy:
  `Domain` has no external dependencies; `Application` depends only on `Domain`;
  `Infrastructure` and `Api` are adapters around the application ports.
- **CQRS** (MediatR): commands mutate aggregates, queries read repositories through
  typed DTOs.
- **Persistence seam**: repositories are interfaces in `Application`; the Phase 1
  implementation is in-memory (`ConcurrentDictionary`), explicitly marked as the
  swap point for EF Core + Postgres in Phase 2.
- **Approval channels**: every channel implements `IApprovalNotifier`. Phase 1 ships
  the dashboard channel (the REST API itself) plus logging/Teams/Email stub adapters
  behind the same interface, so adding a real channel never changes the domain.

## Approval workflow

1. `POST /api/agents` registers a developer agent -> immediately creates a
   `CreateAgent` approval request (`PendingApproval`).
2. A human reviews `GET /api/approvals/pending` and decides via
   `POST /api/approvals/{id}/decide` (`Approved` or `Rejected`, justification
   **mandatory** and recorded in the audit trail).
3. Approval of creation moves the agent to `Approved` — **never** `Active`.
4. Activation requires a **second, separate** approval
   (`POST /api/agents/{id}/activate-request` then deciding its request).
5. Permission escalation and deletion follow the same pattern, each gated by their
   own approval request on a `Retired`/`Active` agent respectively.

Every step writes an `AuditLogEntry` (actor, timestamp, action, justification).

## REST API

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST`   | `/api/agents`                       | Register an agent (queues creation approval) |
| `GET`    | `/api/agents`                       | List agents |
| `POST`   | `/api/agents/{id}/activate-request` | Queue an activation approval |
| `POST`   | `/api/agents/{id}/escalate-request` | Queue a permission escalation approval |
| `POST`   | `/api/agents/{id}/retire`           | Retire an agent |
| `POST`   | `/api/agents/{id}/delete-request`   | Queue a deletion approval |
| `GET`    | `/api/approvals/pending`            | List pending approval requests (dashboard) |
| `POST`   | `/api/approvals/{id}/decide`        | Approve/reject a request (justification required) |
| `GET`    | `/api/audit`                        | Full audit trail |
| `GET`    | `/health`                           | Liveness probe |

Swagger UI is enabled in development (`/swagger-ui`).

## Quick start

```bash
# Build and test (requires the .NET 8 SDK)
dotnet build AgentOrchestrator.sln
dotnet test AgentOrchestrator.sln

# Run with docker
docker compose up --build
curl http://localhost:8080/health
```

## Deployments

- **Docker**: `docker compose up --build` (development).
- **Kubernetes**: `kubectl apply -f deploy/k8s/`.
- **Azure**: `deploy/azure/azure-pipelines.yml` builds/tests, pushes to ACR, and
  deploys the Linux container to App Service.

## Roadmap

- **Phase 1 (this PR)** — Solution skeleton, domain lifecycle + approval aggregates,
  CQRS application layer, in-memory repositories, REST API (dashboard channel),
  stub capability agents, Docker/Kubernetes/Azure scaffolds, CI.
- **Phase 2** — Real Teams/Email approval adapters, EF Core + Postgres persistence,
  event bus.
- **Phase 3** — Real agent logic for all four capability handlers.
- **Phase 4** — Azure/AKS deployment hardening and the dashboard UI.