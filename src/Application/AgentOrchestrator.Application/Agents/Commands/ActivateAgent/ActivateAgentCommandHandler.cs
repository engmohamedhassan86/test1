using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using AgentOrchestrator.Domain.Audit;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AgentOrchestrator.Application.Agents.Commands.ActivateAgent;

public sealed class ActivateAgentCommandHandler : IRequestHandler<ActivateAgentCommand>
{
    private readonly IAgentRepository _agentRepository;
    private readonly IApprovalRequestRepository _approvalRequestRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEnumerable<IApprovalNotifier> _notifiers;
    private readonly ILogger<ActivateAgentCommandHandler> _logger;

    public ActivateAgentCommandHandler(
        IAgentRepository agentRepository,
        IApprovalRequestRepository approvalRequestRepository,
        IAuditLogRepository auditLogRepository,
        IUnitOfWork unitOfWork,
        IEnumerable<IApprovalNotifier> notifiers,
        ILogger<ActivateAgentCommandHandler> logger)
    {
        _agentRepository = agentRepository;
        _approvalRequestRepository = approvalRequestRepository;
        _auditLogRepository = auditLogRepository;
        _unitOfWork = unitOfWork;
        _notifiers = notifiers;
        _logger = logger;
    }

    public async Task Handle(ActivateAgentCommand request, CancellationToken cancellationToken)
    {
        var agent = await _agentRepository.GetByIdAsync(request.AgentId, cancellationToken)
            ?? throw new InvalidOperationException($"Agent '{request.AgentId}' was not found.");

        if (agent.Status != AgentStatus.Approved)
        {
            throw new InvalidOperationException(
                "Agent must be Approved before an activation approval can be requested.");
        }

        var approvalRequest = ApprovalRequest.Create(
            agent.Id,
            ApprovalAction.ActivateAgent,
            request.RequestedBy,
            request.Justification);

        await _approvalRequestRepository.AddAsync(approvalRequest, cancellationToken);

        var auditEntry = AuditLogEntry.Create(
            agent.Id,
            approvalRequest.Id,
            "ActivationApprovalRequested",
            request.RequestedBy,
            request.Justification);
        await _auditLogRepository.AddAsync(auditEntry, cancellationToken);

        foreach (var notifier in _notifiers)
        {
            try
            {
                await notifier.NotifyApprovalRequestedAsync(approvalRequest, agent, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Approval notifier {Notifier} failed to notify approval request {ApprovalRequestId}.",
                    notifier.GetType().Name, approvalRequest.Id);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
