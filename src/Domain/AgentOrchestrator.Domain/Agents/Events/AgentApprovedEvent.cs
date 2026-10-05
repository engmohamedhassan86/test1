using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Agents.Events;

public sealed record AgentApprovedEvent(Guid AgentId, DateTimeOffset OccurredOnUtc) : IDomainEvent;
