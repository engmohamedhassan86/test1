using AgentOrchestrator.Domain.Agents.Events;
using AgentOrchestrator.Domain.Common;
using AgentOrchestrator.Domain.Exceptions;

namespace AgentOrchestrator.Domain.Agents;

/// <summary>
/// The agent aggregate root. Encodes the single non-negotiable rule of this framework:
/// an agent can never become <see cref="AgentStatus.Active"/> on its own. The only path
/// into <see cref="AgentStatus.Active"/> is <see cref="Activate"/>, which only succeeds
/// from <see cref="AgentStatus.Approved"/>, and the only path into
/// <see cref="AgentStatus.Approved"/> is <see cref="MarkApproved"/>, which only succeeds
/// from <see cref="AgentStatus.PendingApproval"/>. Both of those transitions are driven
/// exclusively by the Application layer's <c>DecideApprovalCommandHandler</c> after a
/// human has approved an <c>ApprovalRequest</c>. There is no public API on this class
/// that can reach <see cref="AgentStatus.Active"/> without that handler's involvement.
/// </summary>
public sealed class Agent : AggregateRoot
{
    private readonly List<AgentCapability> _capabilities = new();

    public string Name { get; private set; } = string.Empty;
    public AgentType Type { get; private set; }
    public string Owner { get; private set; } = string.Empty;
    public int Version { get; private set; } = 1;
    public AgentStatus Status { get; private set; } = AgentStatus.Draft;
    public AgentPermission Permission { get; private set; } = AgentPermission.ReadOnly;
    public IReadOnlyCollection<AgentCapability> Capabilities => _capabilities.AsReadOnly();
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? ActivatedAtUtc { get; private set; }
    public DateTimeOffset? RetiredAtUtc { get; private set; }

    /// <summary>
    /// Reserved for EF Core / serialization materialization. Never used directly by
    /// application code — always go through <see cref="Register"/>.
    /// </summary>
    private Agent()
    {
    }

    public static Agent Register(string name, AgentType type, string owner, IEnumerable<AgentCapability> capabilities)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Agent name must not be empty.", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(owner))
        {
            throw new ArgumentException("Agent owner must not be empty.", nameof(owner));
        }

        var now = DateTimeOffset.UtcNow;
        var agent = new Agent
        {
            Name = name,
            Type = type,
            Owner = owner,
            Version = 1,
            Status = AgentStatus.Draft,
            Permission = AgentPermission.ReadOnly,
            CreatedAtUtc = now
        };

        agent._capabilities.AddRange(capabilities);

        agent.Raise(new AgentRegisteredEvent(agent.Id, agent.Name, agent.Type, agent.Owner, now));

        return agent;
    }

    /// <summary>
    /// Records that a human approval has been requested for <paramref name="action"/>.
    /// Only <see cref="ApprovalAction.CreateAgent"/> moves the agent's own status (from
    /// <see cref="AgentStatus.Draft"/> to <see cref="AgentStatus.PendingApproval"/>);
    /// the other approval actions (activate, escalate, delete) are requested against an
    /// agent that is already past Draft and do not change <see cref="Status"/> until the
    /// request is decided — see <see cref="MarkApproved"/>, <see cref="Activate"/>,
    /// <see cref="ApplyApprovedPermission"/>.
    /// </summary>
    public void RequestApproval(ApprovalAction action)
    {
        if (action != ApprovalAction.CreateAgent)
        {
            // Activation / escalation / deletion approvals are requested against an
            // agent whose status is validated by the Application-layer command itself;
            // they do not transition Agent.Status at request time.
            return;
        }

        if (Status != AgentStatus.Draft)
        {
            throw new InvalidAgentStateTransitionException(Id, Status, AgentStatus.PendingApproval);
        }

        Status = AgentStatus.PendingApproval;
    }

    public void MarkApproved()
    {
        if (Status != AgentStatus.PendingApproval)
        {
            throw new InvalidAgentStateTransitionException(Id, Status, AgentStatus.Approved);
        }

        Status = AgentStatus.Approved;
        Raise(new AgentApprovedEvent(Id, DateTimeOffset.UtcNow));
    }

    public void MarkRejected()
    {
        if (Status != AgentStatus.PendingApproval)
        {
            throw new InvalidAgentStateTransitionException(Id, Status, AgentStatus.Draft);
        }

        Status = AgentStatus.Draft;
        Raise(new AgentApprovalRejectedEvent(Id, DateTimeOffset.UtcNow));
    }

    /// <summary>
    /// The only method on this aggregate that can set <see cref="Status"/> to
    /// <see cref="AgentStatus.Active"/>. Only succeeds from <see cref="AgentStatus.Approved"/>,
    /// which itself is only reachable via a decided <c>ApprovalRequest</c>
    /// (see <see cref="MarkApproved"/>). This is the structural guarantee that agents
    /// never auto-activate.
    /// </summary>
    public void Activate()
    {
        if (Status != AgentStatus.Approved)
        {
            throw new InvalidAgentStateTransitionException(Id, Status, AgentStatus.Active);
        }

        Status = AgentStatus.Active;
        ActivatedAtUtc = DateTimeOffset.UtcNow;
        Raise(new AgentActivatedEvent(Id, ActivatedAtUtc.Value));
    }

    /// <summary>
    /// Applies a permission escalation that has already been approved by a human via an
    /// <c>ApprovalRequest</c>. This method must only ever be invoked by
    /// <c>DecideApprovalCommandHandler</c> after calling
    /// <c>ApprovalRequest.Approve</c> for an <see cref="ApprovalAction.EscalatePermission"/>
    /// request — the approval gate lives on the <c>ApprovalRequest</c> aggregate, not here,
    /// because the escalation target level is a property of the request, not of the agent.
    /// As a defensive measure this still requires the agent to be <see cref="AgentStatus.Active"/>,
    /// since only active agents can meaningfully exercise an escalated permission.
    /// </summary>
    public void ApplyApprovedPermission(AgentPermission newPermission)
    {
        if (Status != AgentStatus.Active)
        {
            throw new InvalidAgentStateTransitionException(Id, Status, AgentStatus.Active);
        }

        Permission = newPermission;
        Raise(new AgentPermissionEscalatedEvent(Id, newPermission, DateTimeOffset.UtcNow));
    }

    public void Retire()
    {
        if (Status == AgentStatus.Retired)
        {
            throw new InvalidAgentStateTransitionException(Id, Status, AgentStatus.Retired);
        }

        Status = AgentStatus.Retired;
        RetiredAtUtc = DateTimeOffset.UtcNow;
        Raise(new AgentRetiredEvent(Id, RetiredAtUtc.Value));
    }
}
