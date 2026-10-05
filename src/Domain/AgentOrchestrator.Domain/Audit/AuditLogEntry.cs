using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Audit;

/// <summary>
/// An immutable record of something that happened to an agent or an approval request.
/// Always created by the system (never by a user directly) and never mutated after
/// creation — this is the audit trail that satisfies "log the approver, date, action,
/// and justification" for every governed action.
/// </summary>
public sealed class AuditLogEntry : Entity
{
    public Guid? AgentId { get; private set; }
    public Guid? ApprovalRequestId { get; private set; }
    public string Action { get; private set; } = string.Empty;
    public string PerformedBy { get; private set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; private set; }
    public string? Justification { get; private set; }
    public string? Details { get; private set; }

    /// <summary>
    /// Reserved for EF Core / serialization materialization. Never used directly by
    /// application code — always go through <see cref="Create"/>.
    /// </summary>
    private AuditLogEntry()
    {
    }

    public static AuditLogEntry Create(
        Guid? agentId,
        Guid? approvalRequestId,
        string action,
        string performedBy,
        string? justification = null,
        string? details = null)
    {
        if (string.IsNullOrWhiteSpace(action))
        {
            throw new ArgumentException("Action must not be empty.", nameof(action));
        }

        if (string.IsNullOrWhiteSpace(performedBy))
        {
            throw new ArgumentException("PerformedBy must not be empty.", nameof(performedBy));
        }

        return new AuditLogEntry
        {
            AgentId = agentId,
            ApprovalRequestId = approvalRequestId,
            Action = action,
            PerformedBy = performedBy,
            OccurredAtUtc = DateTimeOffset.UtcNow,
            Justification = justification,
            Details = details
        };
    }
}
