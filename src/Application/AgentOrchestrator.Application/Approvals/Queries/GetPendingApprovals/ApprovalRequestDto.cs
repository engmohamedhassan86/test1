using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;

namespace AgentOrchestrator.Application.Approvals.Queries.GetPendingApprovals;

public sealed record ApprovalRequestDto(
    Guid Id,
    Guid AgentId,
    ApprovalAction Action,
    ApprovalStatus Status,
    string RequestedBy,
    DateTimeOffset RequestedAtUtc,
    string? Justification,
    AgentPermission? RequestedPermission,
    string? DecidedBy,
    DateTimeOffset? DecidedAtUtc,
    string? DecisionJustification);
