namespace AgentOrchestrator.Domain.Agents;

/// <summary>
/// The permission level currently granted to an agent. This is a single escalatable
/// level (not a bitmask of independent flags) — an escalation request always asks to
/// move from the agent's current level to a single higher level, and is only applied
/// once a corresponding <c>ApprovalRequest</c> has been approved by a human.
/// </summary>
public enum AgentPermission
{
    ReadOnly = 0,
    CodeSuggestion = 1,
    CodeWrite = 2,
    TestExecution = 3,
    DeploymentTrigger = 4,
    InfrastructureChange = 5
}
