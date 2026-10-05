using MediatR;

namespace AgentOrchestrator.Application.Agents.Commands.ActivateAgent;

/// <summary>
/// Requests the mandatory human approval needed before an agent may be activated. This
/// command never activates the agent itself — the actual <c>Agent.Activate()</c> call
/// only happens inside <c>DecideApprovalCommandHandler</c> once the resulting
/// <c>ApprovalRequest</c> is approved.
/// </summary>
public sealed record ActivateAgentCommand(Guid AgentId, string RequestedBy, string Justification) : IRequest;
