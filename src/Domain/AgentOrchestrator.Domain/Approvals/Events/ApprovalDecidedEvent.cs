using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Approvals.Events;

public sealed record ApprovalDecidedEvent(
    Guid ApprovalRequestId,
    Guid AgentId,
    ApprovalAction Action,
    bool Approved,
    string DecidedBy,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;
