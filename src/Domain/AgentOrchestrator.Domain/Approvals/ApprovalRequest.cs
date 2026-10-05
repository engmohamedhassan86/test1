using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals.Events;
using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Approvals;

/// <summary>
/// The approval aggregate root. Every agent creation, activation, permission escalation,
/// or deletion must be represented by one of these before it can take effect — see
/// <c>Agent.Activate</c>, <c>Agent.ApplyApprovedPermission</c>. An approval request
/// always carries an auditable trail: who requested it and why, and — once decided —
/// who decided it, when, and why.
/// </summary>
public sealed class ApprovalRequest : AggregateRoot
{
    public Guid AgentId { get; private set; }
    public ApprovalAction Action { get; private set; }
    public ApprovalStatus Status { get; private set; } = ApprovalStatus.Pending;
    public string RequestedBy { get; private set; } = string.Empty;
    public DateTimeOffset RequestedAtUtc { get; private set; }
    public string? Justification { get; private set; }
    public AgentPermission? RequestedPermission { get; private set; }

    public string? DecidedBy { get; private set; }
    public DateTimeOffset? DecidedAtUtc { get; private set; }
    public string? DecisionJustification { get; private set; }

    /// <summary>
    /// Reserved for EF Core / serialization materialization. Never used directly by
    /// application code — always go through <see cref="Create"/>.
    /// </summary>
    private ApprovalRequest()
    {
    }

    public static ApprovalRequest Create(
        Guid agentId,
        ApprovalAction action,
        string requestedBy,
        string? justification,
        AgentPermission? requestedPermission = null)
    {
        if (string.IsNullOrWhiteSpace(requestedBy))
        {
            throw new ArgumentException("RequestedBy must not be empty.", nameof(requestedBy));
        }

        if (action == ApprovalAction.EscalatePermission && requestedPermission is null)
        {
            throw new ArgumentException(
                "RequestedPermission must be supplied for EscalatePermission approval requests.",
                nameof(requestedPermission));
        }

        var now = DateTimeOffset.UtcNow;
        var request = new ApprovalRequest
        {
            AgentId = agentId,
            Action = action,
            Status = ApprovalStatus.Pending,
            RequestedBy = requestedBy,
            RequestedAtUtc = now,
            Justification = justification,
            RequestedPermission = requestedPermission
        };

        request.Raise(new ApprovalRequestedEvent(request.Id, agentId, action, requestedBy, now));

        return request;
    }

    public void Approve(string approver, string justification)
    {
        Decide(approver, justification, ApprovalStatus.Approved);
    }

    public void Reject(string approver, string justification)
    {
        Decide(approver, justification, ApprovalStatus.Rejected);
    }

    private void Decide(string approver, string justification, ApprovalStatus outcome)
    {
        if (string.IsNullOrWhiteSpace(approver))
        {
            throw new ArgumentException("Approver must not be empty.", nameof(approver));
        }

        if (string.IsNullOrWhiteSpace(justification))
        {
            throw new ArgumentException("A decision justification is mandatory for the audit trail.", nameof(justification));
        }

        if (Status != ApprovalStatus.Pending)
        {
            throw new InvalidOperationException(
                $"ApprovalRequest '{Id}' has already been decided (status '{Status}') and cannot be decided again.");
        }

        var now = DateTimeOffset.UtcNow;
        Status = outcome;
        DecidedBy = approver;
        DecidedAtUtc = now;
        DecisionJustification = justification;

        Raise(new ApprovalDecidedEvent(Id, AgentId, Action, outcome == ApprovalStatus.Approved, approver, now));
    }
}
