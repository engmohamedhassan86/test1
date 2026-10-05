using MediatR;

namespace AgentOrchestrator.Application.Agents.Commands.DeleteAgent;

/// <summary>
/// Requests the mandatory human approval needed before a retired agent may be
/// permanently deleted. The actual repository hard-delete only happens inside
/// <c>DecideApprovalCommandHandler</c> once the resulting <c>ApprovalRequest</c> is
/// approved.
/// </summary>
public sealed record DeleteAgentCommand(Guid AgentId, string RequestedBy, string Justification) : IRequest;
