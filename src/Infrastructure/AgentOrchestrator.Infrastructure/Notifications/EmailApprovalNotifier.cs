using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using Microsoft.Extensions.Logging;

namespace AgentOrchestrator.Infrastructure.Notifications;

/// <summary>
/// Placeholder adapter. Wire to SMTP or Microsoft Graph <c>sendMail</c> once the email
/// connection is configured; see docs/approval-channels.md.
/// </summary>
public sealed class EmailApprovalNotifier : IApprovalNotifier
{
    private readonly ILogger<EmailApprovalNotifier> _logger;

    public EmailApprovalNotifier(ILogger<EmailApprovalNotifier> logger)
    {
        _logger = logger;
    }

    public Task NotifyApprovalRequestedAsync(ApprovalRequest request, Agent agent, CancellationToken ct)
    {
        _logger.LogInformation(
            "[Email adapter stub] Would send approval-requested email for {Action} on agent {AgentId} ({AgentName}), request {ApprovalRequestId}.",
            request.Action, agent.Id, agent.Name, request.Id);
        return Task.CompletedTask;
    }

    public Task NotifyApprovalDecidedAsync(ApprovalRequest request, Agent agent, CancellationToken ct)
    {
        _logger.LogInformation(
            "[Email adapter stub] Would send approval-decided email for {Action} on agent {AgentId} ({AgentName}) -> {Status}, request {ApprovalRequestId}.",
            request.Action, agent.Id, agent.Name, request.Status, request.Id);
        return Task.CompletedTask;
    }
}
