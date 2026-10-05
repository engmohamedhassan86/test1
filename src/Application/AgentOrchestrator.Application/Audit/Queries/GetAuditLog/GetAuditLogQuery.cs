using MediatR;

namespace AgentOrchestrator.Application.Audit.Queries.GetAuditLog;

public sealed record GetAuditLogQuery : IRequest<IReadOnlyList<AuditLogEntryDto>>;
