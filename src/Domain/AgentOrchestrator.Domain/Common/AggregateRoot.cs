namespace AgentOrchestrator.Domain.Common;

/// <summary>
/// Base class for aggregate roots: the only entities that may be loaded and persisted
/// independently and that own a consistency boundary for domain invariants.
/// </summary>
public abstract class AggregateRoot : Entity
{
}
