using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Agents.Events;

public sealed record AgentRegisteredEvent(
    Guid AgentId,
    string Name,
    AgentType Type,
    string Owner,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;
