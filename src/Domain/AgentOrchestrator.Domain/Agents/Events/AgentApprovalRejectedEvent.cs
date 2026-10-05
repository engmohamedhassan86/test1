using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Agents.Events;

public sealed record AgentApprovalRejectedEvent(Guid AgentId, DateTimeOffset OccurredOnUtc) : IDomainEvent;
