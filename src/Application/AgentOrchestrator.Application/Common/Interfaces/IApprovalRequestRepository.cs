using AgentOrchestrator.Domain.Approvals;

namespace AgentOrchestrator.Application.Common.Interfaces;

public interface IApprovalRequestRepository
{
    Task<ApprovalRequest?> GetByIdAsync(Guid id, CancellationToken ct);

    Task AddAsync(ApprovalRequest request, CancellationToken ct);

    Task<IReadOnlyList<ApprovalRequest>> ListPendingAsync(CancellationToken ct);

    /// <summary>
    /// No-op for the in-memory implementation; present so EF-Core-backed
    /// implementations have a hook to mark the aggregate as modified.
    /// </summary>
    void Update(ApprovalRequest request);
}
