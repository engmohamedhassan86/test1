namespace AgentOrchestrator.Domain.Agents;

/// <summary>
/// Lifecycle states for an <see cref="Agent"/>. The only non-negotiable rule of this
/// framework is encoded here structurally: there is no transition into
/// <see cref="Active"/> that does not pass through <see cref="Approved"/> first, and the
/// only way to reach <see cref="Approved"/> is via a human-decided <c>ApprovalRequest</c>.
/// </summary>
public enum AgentStatus
{
    Draft = 0,
    PendingApproval = 1,
    Approved = 2,
    Active = 3,
    Retired = 4
}
