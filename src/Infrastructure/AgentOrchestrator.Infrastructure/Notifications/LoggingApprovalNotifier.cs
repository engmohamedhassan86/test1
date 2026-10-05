using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using Microsoft.Extensions.Logging;

namespace AgentOrchestrator.Infrastructure.Notifications;

/// <summary>
/// The default/dev approval notifier: logs a structured line per notification. This
/// stands in for the dashboard channel, which is otherwise implicit (the REST API
/// itself — approvers simply poll/view <c>GET /api/approvals/pending</c>).
/// </summary>
public sealed class LoggingApprovalNotifier : IApprovalNotifier
{
    private readonly ILogger<LoggingApprovalNotifier> _logger;

    public LoggingApprovalNotifier(ILogger<LoggingApprovalNotifier> logger)
    {
        _logger = logger;
    }

    public Task NotifyApprovalRequestedAsync(ApprovalRequest request, Agent agent, CancellationToken ct)
    {
        _logger.LogInformation(
            "Approval requested: {Action} for agent {AgentId} ({AgentName}) by {RequestedBy}. Request {ApprovalRequestId}.",
            request.Action, agent.Id, agent.Name, request.RequestedBy, request.Id);
        return Task.CompletedTask;
    }

    public Task NotifyApprovalDecidedAsync(ApprovalRequest request, Agent agent, CancellationToken ct)
    {
        _logger.LogInformation(
            "Approval decided: {Action} for agent {AgentId} ({AgentName}) -> {Status} by {DecidedBy}. Request {ApprovalRequestId}.",
            request.Action, agent.Id, agent.Name, request.Status, request.DecidedBy, request.Id);
        return Task.CompletedTask;
    }
}
