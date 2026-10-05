using AgentOrchestrator.Application.Agents.Commands.RegisterAgent;
using AgentOrchestrator.Application.Agents.Queries.GetAgents;
using AgentOrchestrator.Application.Approvals.Queries.GetPendingApprovals;
using AgentOrchestrator.Application.Audit.Queries.GetAuditLog;
using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Application.Tests.TestDoubles;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using AgentOrchestrator.Infrastructure.Persistence.Repositories;
using org.junit.jupiter.api.Test;

namespace AgentOrchestrator.Application.Tests;

/// <summary>
/// Verifies the dashboard-facing query side: agent summaries, only-pending approval
/// requests, and the full audit trail, oldest decision surfaced last.
/// </summary>
public sealed class QueryHandlersTest
{
    private readonly InMemoryAgentRepository _agents = new();
    private readonly InMemoryApprovalRequestRepository _approvals = new();
    private readonly InMemoryAuditLogRepository _auditLog = new();
    private readonly InMemoryUnitOfWork _unitOfWork = new();
    private readonly RecordingApprovalNotifier _notifier = new();

    @Test
    public async Task getAgentsReturnsRegisteredAgentSummaries()
    {
        await SeedAgent();

        var handler = new GetAgentsQueryHandler(_agents);
        var result = await handler.Handle(new GetAgentsQuery(), CancellationToken.None);

        Assertions.assertEquals(1, result.Count);
        Assertions.assertEquals("Developer Agent", result[0].Name);
        Assertions.assertEquals(AgentStatus.PendingApproval, result[0].Status);
        Assertions.assertEquals(AgentPermission.ReadOnly, result[0].Permission);
        Assertions.assertEquals(AgentType.Developer, result[0].Type);
    }

    @Test
    public async Task getPendingApprovalsReturnOnlyPendingRequests()
    {
        await SeedAgent();

        var handler = new GetPendingApprovalsQueryHandler(_approvals);
        var result = await handler.Handle(new GetPendingApprovalsQuery(), CancellationToken.None);

        Assertions.assertEquals(1, result.Count);
        Assertions.assertEquals(ApprovalAction.CreateAgent, result[0].Action);
        Assertions.assertEquals(ApprovalStatus.Pending, result[0].Status);
        Assertions.assertEquals("build-pipeline", result[0].RequestedBy);
        Assertions.assertNotNull(result[0].RequestedAtUtc);
    }

    @Test
    public async Task getAuditLogExposesFullTrailWithJustifications()
    {
        await SeedAgent();

        var handler = new GetAuditLogQueryHandler(_auditLog);
        var result = await handler.Handle(new GetAuditLogQuery(), CancellationToken.None);

        Assertions.assertEquals(1, result.Count);
        Assertions.assertEquals("AgentRegistered", result[0].Action);
        Assertions.assertEquals("build-pipeline", result[0].PerformedBy);
        Assertions.assertNotNull(result[0].OccurredAtUtc);
        Assertions.assertNotNull(result[0].Justification);
        Assertions.assertNotNull(result[0].AgentId);
    }

    private async Task SeedAgent()
    {
        var handler = new RegisterAgentCommandHandler(
            _agents, _approvals, _auditLog, _unitOfWork,
            List<IApprovalNotifier>.Of(_notifier), null);

        await handler.Handle(new RegisterAgentCommand(
            "Developer Agent",
            AgentType.Developer,
            "platform-team",
            List<AgentCapability>.Of(new AgentCapability("CodeSuggestion", "Suggests idiomatic code changes")),
            "build-pipeline",
            "First agent in the registry."), CancellationToken.None);
    }
}