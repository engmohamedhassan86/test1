namespace AgentOrchestrator.Application.Common.Interfaces;

/// <summary>
/// Seam for committing a unit of work. The in-memory Phase 1 implementation is a no-op
/// because the in-memory repositories write immediately; a Phase 2 EF Core
/// implementation would call <c>DbContext.SaveChangesAsync</c> here.
/// </summary>
public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken ct);
}
