using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;

namespace AgentOrchestrator.Application.Common.Interfaces;

/// <summary>
/// Implementations are approval-channel adapters (dashboard, Teams, email). The
/// dashboard channel is implicit (the REST API itself); Teams/Email adapters live in
/// Infrastructure and require external connections configured outside this repo.
/// </summary>
public interface IApprovalNotifier
{
    Task NotifyApprovalRequestedAsync(ApprovalRequest request, Agent agent, CancellationToken ct);

    Task NotifyApprovalDecidedAsync(ApprovalRequest request, Agent agent, CancellationToken ct);
}
