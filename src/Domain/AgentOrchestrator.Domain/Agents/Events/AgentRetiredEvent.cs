using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Agents.Events;

public sealed record AgentRetiredEvent(Guid AgentId, DateTimeOffset OccurredOnUtc) : IDomainEvent;
