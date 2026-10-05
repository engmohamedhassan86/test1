using System.Collections.Concurrent;
using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Audit;

namespace AgentOrchestrator.Infrastructure.Persistence.Repositories;

/// <summary>
/// In-memory implementation for the Phase 1 scaffold; replace with EF Core +
/// SQLite/Postgres in Phase 2 behind the same interface.
/// </summary>
public sealed class InMemoryAuditLogRepository : IAuditLogRepository
{
    private readonly ConcurrentDictionary<Guid, AuditLogEntry> _entries = new();

    public Task AddAsync(AuditLogEntry entry, CancellationToken ct)
    {
        _entries[entry.Id] = entry;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AuditLogEntry>> ListAsync(CancellationToken ct)
    {
        IReadOnlyList<AuditLogEntry> result = _entries.Values.ToList();
        return Task.FromResult(result);
    }
}
