using AgentOrchestrator.Application.Common.Interfaces;
using MediatR;

namespace AgentOrchestrator.Application.Audit.Queries.GetAuditLog;

public sealed class GetAuditLogQueryHandler : IRequestHandler<GetAuditLogQuery, IReadOnlyList<AuditLogEntryDto>>
{
    private readonly IAuditLogRepository _auditLogRepository;

    public GetAuditLogQueryHandler(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public async Task<IReadOnlyList<AuditLogEntryDto>> Handle(GetAuditLogQuery request, CancellationToken cancellationToken)
    {
        var entries = await _auditLogRepository.ListAsync(cancellationToken);

        return entries
            .OrderByDescending(e => e.OccurredAtUtc)
            .Select(e => new AuditLogEntryDto(
                e.Id,
                e.AgentId,
                e.ApprovalRequestId,
                e.Action,
                e.PerformedBy,
                e.OccurredAtUtc,
                e.Justification,
                e.Details))
            .ToList();
    }
}
