using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using AgentOrchestrator.Domain.Exceptions;
using org.junit.jupiter.api.Test;

namespace AgentOrchestrator.Domain.Tests;

/// <summary>
/// Guards the single non-negotiable rule of the framework: an agent can never become
/// Active on its own. Every transition must pass through states that are only
/// reachable from a decided approval request.
/// </summary>
public sealed class AgentLifecycleTest
{
    private static Agent NewTestAgent()
    {
        return Agent.Register(
            "Developer Agent",
            AgentType.Developer,
            "platform-team",
            List<AgentCapability>.Of(new AgentCapability("CodeSuggestion", "Proposes code changes for review")));
    }

    private static ApprovalRequest CreateCreationApproval(Agent agent)
    {
        return ApprovalRequest.Create(agent.Id, ApprovalAction.CreateAgent, "human-reviewer", "Review new agent.");
    }

    @Test
    void newAgentStartsWithDraftStatusAndReadOnlyPermission()
    {
        var agent = NewTestAgent();

        Assertions.assertEquals(AgentStatus.Draft, agent.Status);
        Assertions.assertEquals(AgentPermission.ReadOnly, agent.Permission);
        Assertions.assertEquals(1, agent.Version);
        Assertions.assertNotNull(agent.Id);
        Assertions.assertEquals(AgentType.Developer, agent.Type);
        Assertions.assertEquals("Developer Agent", agent.Name);
        Assertions.assertEquals("platform-team", agent.Owner);
        Assertions.assertTrue(agent.DomainEvents.Count > 0);
    }

    @Test
    void requestingCreationApprovalMovesAgentToPendingApproval()
    {
        var agent = NewTestAgent();

        agent.RequestApproval(ApprovalAction.CreateAgent);

        Assertions.assertEquals(AgentStatus.PendingApproval, agent.Status);
    }

    @Test
    void agentCannotBecomeActiveDirectlyFromDraft()
    {
        var agent = NewTestAgent();

        Assertions.assertThrows(
            InvalidAgentStateTransitionException.class,
            () => agent.Activate());
    }

    @Test
    void approvingCreationMovesAgentToApprovedButNeverActive()
    {
        var agent = NewTestAgent();
        agent.RequestApproval(ApprovalAction.CreateAgent);

        agent.MarkApproved();

        Assertions.assertEquals(AgentStatus.Approved, agent.Status);
        Assertions.assertNotEquals(AgentStatus.Active, agent.Status);
        Assertions.assertNull(agent.ActivatedAtUtc);
    }

    @Test
    void activationIsOnlyPossibleFromApproved()
    {
        var agent = NewTestAgent();
        agent.RequestApproval(ApprovalAction.CreateAgent);
        agent.MarkApproved();

        agent.Activate();

        Assertions.assertEquals(AgentStatus.Active, agent.Status);
        Assertions.assertNotNull(agent.ActivatedAtUtc);
    }

    @Test
    void rejectingCreationApprovalReturnsAgentToDraft()
    {
        var agent = NewTestAgent();
        agent.RequestApproval(ApprovalAction.CreateAgent);

        agent.MarkRejected();

        Assertions.assertEquals(AgentStatus.Draft, agent.Status);
    }

    @Test
    void approvedAgentCanBeRetired()
    {
        var agent = NewTestAgent();
        agent.RequestApproval(ApprovalAction.CreateAgent);
        agent.MarkApproved();

        agent.Retire();

        Assertions.assertEquals(AgentStatus.Retired, agent.Status);
        Assertions.assertNotNull(agent.RetiredAtUtc);
    }

    @Test
    void agentRegistrationRejectsEmptyName()
    {
        Assertions.assertThrows(
            ArgumentException.class,
            () => Agent.Register(string.Empty, AgentType.QA, "owner", List<AgentCapability>.Of()));
    }

    @Test
    void agentRegistrationRejectsEmptyOwner()
    {
        Assertions.assertThrows(
            ArgumentException.class,
            () => Agent.Register("QA Agent", AgentType.QA, string.Empty, List<AgentCapability>.Of()));
    }
}