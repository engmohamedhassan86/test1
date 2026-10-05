using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Approvals;
using AgentOrchestrator.Domain.Audit;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AgentOrchestrator.Application.Approvals.Commands.DecideApproval;

/// <summary>
/// Applies a human decision to an <see cref="ApprovalRequest"/>. This handler is the
/// only place in the system that is allowed to call <c>Agent.MarkApproved</c>,
/// <c>Agent.Activate</c>, or <c>Agent.ApplyApprovedPermission</c> — i.e. the only place
/// an agent can actually move forward in its lifecycle. Everywhere else in the
/// Application layer only ever creates a Pending <see cref="ApprovalRequest"/>.
/// </summary>
public sealed class DecideApprovalCommandHandler : IRequestHandler<DecideApprovalCommand>
{
    private readonly IApprovalRequestRepository _approvalRequestRepository;
    private readonly IAgentRepository _agentRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEnumerable<IApprovalNotifier> _notifiers;
    private readonly ILogger<DecideApprovalCommandHandler> _logger;

    public DecideApprovalCommandHandler(
        IApprovalRequestRepository approvalRequestRepository,
        IAgentRepository agentRepository,
        IAuditLogRepository auditLogRepository,
        IUnitOfWork unitOfWork,
        IEnumerable<IApprovalNotifier> notifiers,
        ILogger<DecideApprovalCommandHandler> logger)
    {
        _approvalRequestRepository = approvalRequestRepository;
        _agentRepository = agentRepository;
        _auditLogRepository = auditLogRepository;
        _unitOfWork = unitOfWork;
        _notifiers = notifiers;
        _logger = logger;
    }

    public async Task Handle(DecideApprovalCommand request, CancellationToken cancellationToken)
    {
        var approvalRequest = await _approvalRequestRepository.GetByIdAsync(request.ApprovalRequestId, cancellationToken)
            ?? throw new InvalidOperationException($"ApprovalRequest '{request.ApprovalRequestId}' was not found.");

        var agent = await _agentRepository.GetByIdAsync(approvalRequest.AgentId, cancellationToken)
            ?? throw new InvalidOperationException($"Agent '{approvalRequest.AgentId}' was not found.");

        if (request.Approved)
        {
            approvalRequest.Approve(request.DecidedBy, request.Justification);

            switch (approvalRequest.Action)
            {
                case ApprovalAction.CreateAgent:
                    // Becomes Approved, not Active: a separate ActivateAgent approval
                    // is still required before this agent may ever become Active.
                    agent.MarkApproved();
                    _agentRepository.Update(agent);
                    break;

                case ApprovalAction.ActivateAgent:
                    agent.Activate();
                    _agentRepository.Update(agent);
                    break;

                case ApprovalAction.EscalatePermission:
                    agent.ApplyApprovedPermission(approvalRequest.RequestedPermission!.Value);
                    _agentRepository.Update(agent);
                    break;

                case ApprovalAction.DeleteAgent:
                    await _agentRepository.DeleteAsync(agent.Id, cancellationToken);
                    break;

                default:
                    throw new InvalidOperationException($"Unknown approval action '{approvalRequest.Action}'.");
            }
        }
        else
        {
            approvalRequest.Reject(request.DecidedBy, request.Justification);

            if (approvalRequest.Action == ApprovalAction.CreateAgent)
            {
                // Only CreateAgent has already moved the agent's own status (to
                // PendingApproval); rejecting it sends the agent back to Draft. For
                // ActivateAgent/EscalatePermission/DeleteAgent, nothing on the agent
                // itself has moved yet, so a rejection leaves the agent's status
                // untouched — there is nothing to roll back.
                agent.MarkRejected();
                _agentRepository.Update(agent);
            }
        }

        _approvalRequestRepository.Update(approvalRequest);

        var auditEntry = AuditLogEntry.Create(
            agent.Id,
            approvalRequest.Id,
            $"ApprovalDecided:{(request.Approved ? "Approved" : "Rejected")}:{approvalRequest.Action}",
            request.DecidedBy,
            request.Justification);
        await _auditLogRepository.AddAsync(auditEntry, cancellationToken);

        foreach (var notifier in _notifiers)
        {
            try
            {
                await notifier.NotifyApprovalDecidedAsync(approvalRequest, agent, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Approval notifier {Notifier} failed to notify approval decision {ApprovalRequestId}.",
                    notifier.GetType().Name, approvalRequest.Id);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
