namespace AgentOrchestrator.Domain.Common;

/// <summary>
/// Marker interface for all domain events raised by aggregates in this bounded context.
/// </summary>
public interface IDomainEvent
{
    DateTimeOffset OccurredOnUtc { get; }
}
