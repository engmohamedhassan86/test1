using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Agents.Events;

public sealed record AgentPermissionEscalatedEvent(
    Guid AgentId,
    AgentPermission NewPermission,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;
