using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;

namespace AgentOrchestrator.Application.Tests.TestDoubles;

/// <summary>
/// Test double capturing every notification the command handlers emit, so tests can
/// assert that the approval fan-out (dashboard/Teams/email) is driven on every
/// request and decision without touching any real channel adapter.
/// </summary>
public sealed class RecordingApprovalNotifier : IApprovalNotifier
{
    public int RequestedCount;
    public int DecidedCount;
    public bool EverNotified => RequestedCount > 0 || DecidedCount > 0;
    public ApprovalRequest? LastRequest;

    public Task NotifyApprovalRequestedAsync(ApprovalRequest request, Agent agent, CancellationToken ct)
    {
        RequestedCount++;
        LastRequest = request;
        return Task.CompletedTask;
    }

    public Task NotifyApprovalDecidedAsync(ApprovalRequest request, Agent agent, CancellationToken ct)
    {
        DecidedCount++;
        LastRequest = request;
        return Task.CompletedTask;
    }
}