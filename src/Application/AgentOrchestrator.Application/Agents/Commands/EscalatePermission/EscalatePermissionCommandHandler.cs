using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using AgentOrchestrator.Domain.Audit;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AgentOrchestrator.Application.Agents.Commands.EscalatePermission;

public sealed class EscalatePermissionCommandHandler : IRequestHandler<EscalatePermissionCommand>
{
    private readonly IAgentRepository _agentRepository;
    private readonly IApprovalRequestRepository _approvalRequestRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEnumerable<IApprovalNotifier> _notifiers;
    private readonly ILogger<EscalatePermissionCommandHandler> _logger;

    public EscalatePermissionCommandHandler(
        IAgentRepository agentRepository,
        IApprovalRequestRepository approvalRequestRepository,
        IAuditLogRepository auditLogRepository,
        IUnitOfWork unitOfWork,
        IEnumerable<IApprovalNotifier> notifiers,
        ILogger<EscalatePermissionCommandHandler> logger)
    {
        _agentRepository = agentRepository;
        _approvalRequestRepository = approvalRequestRepository;
        _auditLogRepository = auditLogRepository;
        _unitOfWork = unitOfWork;
        _notifiers = notifiers;
        _logger = logger;
    }

    public async Task Handle(EscalatePermissionCommand request, CancellationToken cancellationToken)
    {
        var agent = await _agentRepository.GetByIdAsync(request.AgentId, cancellationToken)
            ?? throw new InvalidOperationException($"Agent '{request.AgentId}' was not found.");

        if (agent.Status != AgentStatus.Active)
        {
            throw new InvalidOperationException(
                "Agent must be Active before a permission escalation approval can be requested.");
        }

        var approvalRequest = ApprovalRequest.Create(
            agent.Id,
            ApprovalAction.EscalatePermission,
            request.RequestedBy,
            request.Justification,
            request.RequestedPermission);

        await _approvalRequestRepository.AddAsync(approvalRequest, cancellationToken);

        var auditEntry = AuditLogEntry.Create(
            agent.Id,
            approvalRequest.Id,
            "PermissionEscalationApprovalRequested",
            request.RequestedBy,
            request.Justification,
            $"Requested permission level: {request.RequestedPermission}");
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
