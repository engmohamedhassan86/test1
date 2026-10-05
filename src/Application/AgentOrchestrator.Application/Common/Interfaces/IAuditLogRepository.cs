using AgentOrchestrator.Domain.Audit;

namespace AgentOrchestrator.Application.Common.Interfaces;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLogEntry entry, CancellationToken ct);

    Task<IReadOnlyList<AuditLogEntry>> ListAsync(CancellationToken ct);
}
