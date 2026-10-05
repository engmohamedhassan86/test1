namespace AgentOrchestrator.Domain.Approvals;

/// <summary>
/// The kind of agent-affecting action an <see cref="ApprovalRequest"/> is gating.
/// Every one of these requires a human decision before it can take effect.
/// </summary>
public enum ApprovalAction
{
    CreateAgent = 0,
    ActivateAgent = 1,
    EscalatePermission = 2,
    DeleteAgent = 3
}
