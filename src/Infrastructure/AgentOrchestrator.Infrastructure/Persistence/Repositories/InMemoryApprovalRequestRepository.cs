using System.Collections.Concurrent;
using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Approvals;

namespace AgentOrchestrator.Infrastructure.Persistence.Repositories;

/// <summary>
/// In-memory implementation for the Phase 1 scaffold; replace with EF Core +
/// SQLite/Postgres in Phase 2 behind the same interface.
/// </summary>
public sealed class InMemoryApprovalRequestRepository : IApprovalRequestRepository
{
    private readonly ConcurrentDictionary<Guid, ApprovalRequest> _requests = new();

    public Task<ApprovalRequest?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        _requests.TryGetValue(id, out var request);
        return Task.FromResult(request);
    }

    public Task AddAsync(ApprovalRequest request, CancellationToken ct)
    {
        _requests[request.Id] = request;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ApprovalRequest>> ListPendingAsync(CancellationToken ct)
    {
        IReadOnlyList<ApprovalRequest> result = _requests.Values
            .Where(r => r.Status == ApprovalStatus.Pending)
            .ToList();
        return Task.FromResult(result);
    }

    public void Update(ApprovalRequest request)
    {
        // No-op: the in-memory store already holds a reference to the same mutable
        // aggregate instance, so mutations are visible immediately. Present to satisfy
        // IApprovalRequestRepository for future EF-Core-backed implementations.
        _requests[request.Id] = request;
    }
}
