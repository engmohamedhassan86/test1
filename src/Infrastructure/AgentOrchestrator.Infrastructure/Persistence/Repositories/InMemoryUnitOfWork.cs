using AgentOrchestrator.Application.Common.Interfaces;

namespace AgentOrchestrator.Infrastructure.Persistence.Repositories;

/// <summary>
/// In-memory implementation for the Phase 1 scaffold. <see cref="SaveChangesAsync"/> is
/// a no-op because the in-memory repositories write immediately on each call; this is
/// the seam where Phase 2's real <c>DbContext.SaveChangesAsync</c> would be invoked.
/// </summary>
public sealed class InMemoryUnitOfWork : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}
