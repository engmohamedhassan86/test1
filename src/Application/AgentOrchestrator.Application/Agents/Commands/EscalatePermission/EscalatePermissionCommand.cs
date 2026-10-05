using AgentOrchestrator.Domain.Agents;
using MediatR;

namespace AgentOrchestrator.Application.Agents.Commands.EscalatePermission;

/// <summary>
/// Requests the mandatory human approval needed before an agent's permission level may
/// be escalated. The actual <c>Agent.ApplyApprovedPermission()</c> call only happens
/// inside <c>DecideApprovalCommandHandler</c> once the resulting <c>ApprovalRequest</c>
/// is approved.
/// </summary>
public sealed record EscalatePermissionCommand(
    Guid AgentId,
    AgentPermission RequestedPermission,
    string RequestedBy,
    string Justification) : IRequest;
