using MediatR;

namespace AgentOrchestrator.Application.Approvals.Commands.DecideApproval;

/// <summary>
/// The single choke point through which every agent creation, activation, permission
/// escalation, or deletion is actually allowed to take effect. A human decision is
/// mandatory and must carry a justification for the audit trail.
/// </summary>
public sealed record DecideApprovalCommand(
    Guid ApprovalRequestId,
    bool Approved,
    string DecidedBy,
    string Justification) : IRequest;
