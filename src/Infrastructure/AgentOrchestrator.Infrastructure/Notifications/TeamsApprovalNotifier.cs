using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using Microsoft.Extensions.Logging;

namespace AgentOrchestrator.Infrastructure.Notifications;

/// <summary>
/// Placeholder adapter. Wire to Microsoft Graph / Teams Incoming Webhook once the Teams
/// connection is configured; see docs/approval-channels.md.
/// </summary>
public sealed class TeamsApprovalNotifier : IApprovalNotifier
{
    private readonly ILogger<TeamsApprovalNotifier> _logger;

    public TeamsApprovalNotifier(ILogger<TeamsApprovalNotifier> logger)
    {
        _logger = logger;
    }

    public Task NotifyApprovalRequestedAsync(ApprovalRequest request, Agent agent, CancellationToken ct)
    {
        _logger.LogInformation(
            "[Teams adapter stub] Would post approval-requested card for {Action} on agent {AgentId} ({AgentName}), request {ApprovalRequestId}.",
            request.Action, agent.Id, agent.Name, request.Id);
        return Task.CompletedTask;
    }

    public Task NotifyApprovalDecidedAsync(ApprovalRequest request, Agent agent, CancellationToken ct)
    {
        _logger.LogInformation(
            "[Teams adapter stub] Would post approval-decided card for {Action} on agent {AgentId} ({AgentName}) -> {Status}, request {ApprovalRequestId}.",
            request.Action, agent.Id, agent.Name, request.Status, request.Id);
        return Task.CompletedTask;
    }
}
