using AgentOrchestrator.Domain.Agents;

namespace AgentOrchestrator.Domain.Exceptions;

/// <summary>
/// Raised whenever an operation would move an <see cref="Agent"/> between two states
/// that are not a legal transition in the agent lifecycle state machine.
/// </summary>
public sealed class InvalidAgentStateTransitionException : DomainException
{
    public Guid AgentId { get; }
    public AgentStatus FromStatus { get; }
    public AgentStatus ToStatus { get; }

    public InvalidAgentStateTransitionException(Guid agentId, AgentStatus fromStatus, AgentStatus toStatus)
        : base($"Agent '{agentId}' cannot transition from '{fromStatus}' to '{toStatus}'.")
    {
        AgentId = agentId;
        FromStatus = fromStatus;
        ToStatus = toStatus;
    }
}
