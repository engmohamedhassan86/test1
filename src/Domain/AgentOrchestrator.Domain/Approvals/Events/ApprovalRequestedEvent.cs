using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Approvals.Events;

public sealed record ApprovalRequestedEvent(
    Guid ApprovalRequestId,
    Guid AgentId,
    ApprovalAction Action,
    string RequestedBy,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;
