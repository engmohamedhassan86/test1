using System.Collections.Concurrent;
using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;

namespace AgentOrchestrator.Infrastructure.Persistence.Repositories;

/// <summary>
/// In-memory implementation for the Phase 1 scaffold; replace with EF Core +
/// SQLite/Postgres in Phase 2 behind the same interface.
/// </summary>
public sealed class InMemoryAgentRepository : IAgentRepository
{
    private readonly ConcurrentDictionary<Guid, Agent> _agents = new();

    public Task<Agent?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        _agents.TryGetValue(id, out var agent);
        return Task.FromResult(agent);
    }

    public Task AddAsync(Agent agent, CancellationToken ct)
    {
        _agents[agent.Id] = agent;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Agent>> ListAsync(CancellationToken ct)
    {
        IReadOnlyList<Agent> result = _agents.Values.ToList();
        return Task.FromResult(result);
    }

    public void Update(Agent agent)
    {
        // No-op: the in-memory store already holds a reference to the same mutable
        // aggregate instance, so mutations are visible immediately. Present to satisfy
        // IAgentRepository for future EF-Core-backed implementations.
        _agents[agent.Id] = agent;
    }

    public Task DeleteAsync(Guid id, CancellationToken ct)
    {
        _agents.TryRemove(id, out _);
        return Task.CompletedTask;
    }
}
