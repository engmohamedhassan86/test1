using AgentOrchestrator.Domain.Agents;

namespace AgentOrchestrator.Application.Common.Interfaces;

public interface IAgentRepository
{
    Task<Agent?> GetByIdAsync(Guid id, CancellationToken ct);

    Task AddAsync(Agent agent, CancellationToken ct);

    Task<IReadOnlyList<Agent>> ListAsync(CancellationToken ct);

    /// <summary>
    /// No-op for the in-memory implementation; present so EF-Core-backed
    /// implementations have a hook to mark the aggregate as modified.
    /// </summary>
    void Update(Agent agent);

    Task DeleteAsync(Guid id, CancellationToken ct);
}
