using AgentOrchestrator.Application.Agents.Commands.ActivateAgent;
using AgentOrchestrator.Application.Agents.Commands.DeleteAgent;
using AgentOrchestrator.Application.Agents.Commands.EscalatePermission;
using AgentOrchestrator.Application.Agents.Commands.RegisterAgent;
using AgentOrchestrator.Application.Agents.Commands.RetireAgent;
using AgentOrchestrator.Application.Approvals.Commands.DecideApproval;
using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Application.Tests.TestDoubles;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using AgentOrchestrator.Infrastructure.Persistence.Repositories;
using org.junit.jupiter.api.Test;

namespace AgentOrchestrator.Application.Tests;

/// <summary>
/// End-to-end command flows through the CQRS handlers backed by the real in-memory
/// repositories. These tests pin the framework guarantee: no command path ever moves
/// an agent into Active (or applies an escalation, or deletes an agent) without a
/// human-decided approval request, and every governed action lands in the audit log.
/// </summary>
public sealed class AgentApprovalLifecycleTest
{
    private readonly InMemoryAgentRepository _agents = new();
    private readonly InMemoryApprovalRequestRepository _approvals = new();
    private readonly InMemoryAuditLogRepository _auditLog = new();
    private readonly InMemoryUnitOfWork _unitOfWork = new();
    private readonly RecordingApprovalNotifier _notifier = new();

    private RegisterAgentCommandHandler NewRegisterHandler()
    {
        return new RegisterAgentCommandHandler(
            _agents, _approvals, _auditLog, _unitOfWork,
            List<IApprovalNotifier>.Of(_notifier), null);
    }

    private DecideApprovalCommandHandler NewDecideHandler()
    {
        return new DecideApprovalCommandHandler(
            _approvals, _agents, _auditLog, _unitOfWork,
            List<IApprovalNotifier>.Of(_notifier), null);
    }

    private ActivateAgentCommandHandler NewActivateRequestHandler()
    {
        return new ActivateAgentCommandHandler(
            _agents, _approvals, _auditLog, _unitOfWork,
            List<IApprovalNotifier>.Of(_notifier), null);
    }

    private EscalatePermissionCommandHandler NewEscalateRequestHandler()
    {
        return new EscalatePermissionCommandHandler(
            _agents, _approvals, _auditLog, _unitOfWork,
            List<IApprovalNotifier>.Of(_notifier), null);
    }

    private DeleteAgentCommandHandler NewDeleteRequestHandler()
    {
        return new DeleteAgentCommandHandler(
            _agents, _approvals, _auditLog, _unitOfWork,
            List<IApprovalNotifier>.Of(_notifier), null);
    }

    private RetireAgentCommandHandler NewRetireHandler()
    {
        return new RetireAgentCommandHandler(
            _agents, _approvals, _auditLog, _unitOfWork,
            List<IApprovalNotifier>.Of(_notifier), null);
    }

    private async Task<Guid> RegisterAgent()
    {
        return await NewRegisterHandler().Handle(new RegisterAgentCommand(
            "Developer Agent",
            AgentType.Developer,
            "platform-team",
            List<AgentCapability>.Of(new AgentCapability("CodeSuggestion", "Suggests idiomatic code changes")),
            "build-pipeline",
            "First agent in the registry."), CancellationToken.None);
    }

    private async Task<ApprovalRequest> DecideFirstPendingApproval(bool approved, string reviewer)
    {
        var pending = (await _approvals.ListPendingAsync(CancellationToken.None)).ToList();
        var first = pending[0];

        await NewDecideHandler().Handle(
            new DecideApprovalCommand(first.Id, approved, reviewer, "Decision recorded for the audit trail."),
            CancellationToken.None);

        return first;
    }

    @Test
    public async Task registeringAgentCreatesPendingApprovalAndNeverActivatesIt()
    {
        var agentId = await RegisterAgent();

        var agent = await _agents.GetByIdAsync(agentId, CancellationToken.None);
        Assertions.assertEquals(AgentStatus.PendingApproval, agent.Status);
        Assertions.assertNotEquals(AgentStatus.Active, agent.Status);

        var pending = (await _approvals.ListPendingAsync(CancellationToken.None)).ToList();
        Assertions.assertEquals(1, pending.Count);
        Assertions.assertEquals(ApprovalAction.CreateAgent, pending[0].Action);

        var audit = (await _auditLog.ListAsync(CancellationToken.None)).ToList();
        Assertions.assertEquals(1, audit.Count);
        Assertions.assertEquals("AgentRegistered", audit[0].Action);

        Assertions.assertEquals(1, _notifier.RequestedCount);
        Assertions.assertEquals(0, _notifier.DecidedCount);
    }

    @Test
    public async Task approvingCreationMovesAgentToApprovedButNotActive()
    {
        var agentId = await RegisterAgent();

        var decided = await DecideFirstPendingApproval(true, "human-reviewer");

        var agent = await _agents.GetByIdAsync(agentId, CancellationToken.None);
        Assertions.assertEquals(AgentStatus.Approved, agent.Status);
        Assertions.assertNotEquals(AgentStatus.Active, agent.Status);
        Assertions.assertNull(agent.ActivatedAtUtc);
        Assertions.assertEquals(ApprovalStatus.Approved, decided.Status);

        var audit = (await _auditLog.ListAsync(CancellationToken.None)).ToList();
        Assertions.assertTrue(audit.Any(e => e.Action == "ApprovalDecided:Approved:CreateAgent"));
        Assertions.assertEquals(1, _notifier.DecidedCount);
    }

    @Test
    public async Task rejectingCreationReturnsAgentToDraft()
    {
        var agentId = await RegisterAgent();

        await DecideFirstPendingApproval(false, "human-reviewer");

        var agent = await _agents.GetByIdAsync(agentId, CancellationToken.None);
        Assertions.assertEquals(AgentStatus.Draft, agent.Status);

        var audit = (await _auditLog.ListAsync(CancellationToken.None)).ToList();
        Assertions.assertTrue(audit.Any(e => e.Action == "ApprovalDecided:Rejected:CreateAgent"));
    }

    @Test
    public async Task activationRequiresItsOwnSeparateApproval()
    {
        var agentId = await RegisterAgent();
        await DecideFirstPendingApproval(true, "human-reviewer");

        // Requesting activation only creates another approval; it must NOT activate.
        await NewActivateRequestHandler().Handle(
            new ActivateAgentCommand(agentId, "build-pipeline", "Agent is ready to run."),
            CancellationToken.None);

        var agentAfterRequest = await _agents.GetByIdAsync(agentId, CancellationToken.None);
        Assertions.assertEquals(AgentStatus.Approved, agentAfterRequest.Status);
        Assertions.assertNotEquals(AgentStatus.Active, agentAfterRequest.Status);

        // Deciding the activation approval is what finally activates.
        var pending = (await _approvals.ListPendingAsync(CancellationToken.None)).ToList();
        var activationRequest = pending.Where(r => r.Action == ApprovalAction.ActivateAgent).ToList()[0];
        await NewDecideHandler().Handle(
            new DecideApprovalCommand(activationRequest.Id, true, "human-reviewer", "Go live."),
            CancellationToken.None);

        var agent = await _agents.GetByIdAsync(agentId, CancellationToken.None);
        Assertions.assertEquals(AgentStatus.Active, agent.Status);
        Assertions.assertNotNull(agent.ActivatedAtUtc);
    }

    @Test
    public async Task activationRequestIsRejectedForNonApprovedAgent()
    {
        var agentId = await RegisterAgent();

        var rejected = false;
        try
        {
            await NewActivateRequestHandler().Handle(
                new ActivateAgentCommand(agentId, "build-pipeline", "Activate immediately."),
                CancellationToken.None);
        }
        catch (InvalidOperationException ex)
        {
            rejected = true;
        }

        Assertions.assertTrue(rejected);
    }

    @Test
    public async Task permissionEscalationRequiresApprovalAndActiveAgent()
    {
        var agentId = await RegisterAgent();
        await DecideFirstPendingApproval(true, "human-reviewer");

        var pending = (await _approvals.ListPendingAsync(CancellationToken.None)).ToList();
        var activationRequest = pending.Where(r => r.Action == ApprovalAction.ActivateAgent).ToList();
        Assertions.assertEquals(0, activationRequest.Count);

        // Activate first (creation -> approved -> activation approval -> active).
        await NewActivateRequestHandler().Handle(
            new ActivateAgentCommand(agentId, "build-pipeline", "Ready."), CancellationToken.None);
        var afterActivateRequest = (await _approvals.ListPendingAsync(CancellationToken.None)).ToList()
            .Where(r => r.Action == ApprovalAction.ActivateAgent).ToList();
        await NewDecideHandler().Handle(
            new DecideApprovalCommand(afterActivateRequest[0].Id, true, "human-reviewer", "Go live."),
            CancellationToken.None);

        // Requesting an escalation must not change the permission until decided.
        await NewEscalateRequestHandler().Handle(new EscalatePermissionCommand(
            agentId, AgentPermission.CodeWrite, "build-pipeline", "Need write access."), CancellationToken.None);

        var agentBefore = await _agents.GetByIdAsync(agentId, CancellationToken.None);
        Assertions.assertEquals(AgentPermission.ReadOnly, agentBefore.Permission);

        var escalateRequest = (await _approvals.ListPendingAsync(CancellationToken.None)).ToList()
            .Where(r => r.Action == ApprovalAction.EscalatePermission).ToList();
        await NewDecideHandler().Handle(
            new DecideApprovalCommand(escalateRequest[0].Id, true, "human-reviewer", "Granted."),
            CancellationToken.None);

        var agentAfter = await _agents.GetByIdAsync(agentId, CancellationToken.None);
        Assertions.assertEquals(AgentPermission.CodeWrite, agentAfter.Permission);
    }

    @Test
    public async Task deletionRequiresRetiredAgentAndApproval()
    {
        var agentId = await RegisterAgent();
        await DecideFirstPendingApproval(true, "human-reviewer");

        await NewRetireHandler().Handle(new RetireAgentCommand(
            agentId, "build-pipeline", "No longer needed."), CancellationToken.None);

        // Deletion needs its own approval and is only allowed for Retired agents.
        await NewDeleteRequestHandler().Handle(new DeleteAgentCommand(
            agentId, "build-pipeline", "Remove from the registry."), CancellationToken.None);

        var pending = (await _approvals.ListPendingAsync(CancellationToken.None)).ToList();
        var deleteRequest = pending.Where(r => r.Action == ApprovalAction.DeleteAgent).ToList()[0];
        await NewDecideHandler().Handle(
            new DecideApprovalCommand(deleteRequest.Id, true, "human-reviewer", "Approving deletion."),
            CancellationToken.None);

        var agent = await _agents.GetByIdAsync(agentId, CancellationToken.None);
        Assertions.assertNull(agent);
    }
}