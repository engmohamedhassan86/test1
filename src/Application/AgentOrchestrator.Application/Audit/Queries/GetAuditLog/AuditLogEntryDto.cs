namespace AgentOrchestrator.Application.Audit.Queries.GetAuditLog;

public sealed record AuditLogEntryDto(
    Guid Id,
    Guid? AgentId,
    Guid? ApprovalRequestId,
    string Action,
    string PerformedBy,
    DateTimeOffset OccurredAtUtc,
    string? Justification,
    string? Details);
