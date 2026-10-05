using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using org.junit.jupiter.api.Test;

namespace AgentOrchestrator.Domain.Tests;

/// <summary>
/// Exercises the approval aggregate: creation, single-decision enforcement, and the
/// mandatory audit fields (approver, date, and justification) on every decision.
/// </summary>
public sealed class ApprovalRequestTest
{
    private static ApprovalRequest NewCreationRequest()
    {
        return ApprovalRequest.Create(
            Guid.NewGuid(),
            ApprovalAction.CreateAgent,
            "requestor",
            "Please review this new agent.");
    }

    @Test
    void newRequestIsPendingWithAuditMetadata()
    {
        var request = NewCreationRequest();

        Assertions.assertEquals(ApprovalStatus.Pending, request.Status);
        Assertions.assertNotNull(request.Id);
        Assertions.assertEquals("requestor", request.RequestedBy);
        Assertions.assertNotNull(request.RequestedAtUtc);
    }

    @Test
    void approveRecordsApproverDateAndJustification()
    {
        var request = NewCreationRequest();

        request.Approve("human-reviewer", "Looks safe - gating the agent on review.");

        Assertions.assertEquals(ApprovalStatus.Approved, request.Status);
        Assertions.assertEquals("human-reviewer", request.DecidedBy);
        Assertions.assertNotNull(request.DecidedAtUtc);
        Assertions.assertEquals("Looks safe - gating the agent on review.", request.DecisionJustification);
    }

    @Test
    void rejectRecordsApproverDateAndJustification()
    {
        var request = NewCreationRequest();

        request.Reject("human-reviewer", "Not comfortable with write access yet.");

        Assertions.assertEquals(ApprovalStatus.Rejected, request.Status);
        Assertions.assertEquals("human-reviewer", request.DecidedBy);
        Assertions.assertNotNull(request.DecidedAtUtc);
        Assertions.assertEquals("Not comfortable with write access yet.", request.DecisionJustification);
    }

    @Test
    void requestCannotBeDecidedTwice()
    {
        var request = NewCreationRequest();
        request.Approve("human-reviewer", "Approved.");

        Assertions.assertThrows(
            InvalidOperationException.class,
            () => request.Reject("someone-else", "Actually, no."));
    }

    @Test
    void approveWithoutApproverIsRejected()
    {
        var request = NewCreationRequest();

        Assertions.assertThrows(
            ArgumentException.class,
            () => request.Approve(string.Empty, "Approved."));
    }

    @Test
    void approveWithoutJustificationIsRejected()
    {
        var request = NewCreationRequest();

        Assertions.assertThrows(
            ArgumentException.class,
            () => request.Approve("human-reviewer", string.Empty));
    }

    @Test
    void escalatePermissionRequiresRequestedPermissionLevel()
    {
        Assertions.assertThrows(
            ArgumentException.class,
            () => ApprovalRequest.Create(Guid.NewGuid(), ApprovalAction.EscalatePermission, "requestor", "Need write access."));
    }

    @Test
    void escalatePermissionCarriesRequestedPermissionLevel()
    {
        var request = ApprovalRequest.Create(
            Guid.NewGuid(),
            ApprovalAction.EscalatePermission,
            "requestor",
            "Need write access.",
            AgentPermission.CodeWrite);

        Assertions.assertEquals(AgentPermission.CodeWrite, request.RequestedPermission);
    }
}