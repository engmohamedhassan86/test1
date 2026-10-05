using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;
using AgentOrchestrator.Domain.Approvals;
using AgentOrchestrator.Domain.Audit;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AgentOrchestrator.Application.Agents.Commands.RegisterAgent;

/// <summary>
/// Creates the agent in Draft, immediately requests the mandatory creation approval
/// (moving it to PendingApproval), and persists an audit trail entry. This handler
/// never sets the agent's status to Approved or Active — that only ever happens inside
/// <c>DecideApprovalCommandHandler</c> once a human has decided the resulting
/// <see cref="ApprovalRequest"/>.
/// </summary>
public sealed class RegisterAgentCommandHandler : IRequestHandler<RegisterAgentCommand, Guid>
{
    private readonly IAgentRepository _agentRepository;
    private readonly IApprovalRequestRepository _approvalRequestRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEnumerable<IApprovalNotifier> _notifiers;
    private readonly ILogger<RegisterAgentCommandHandler> _logger;

    public RegisterAgentCommandHandler(
        IAgentRepository agentRepository,
        IApprovalRequestRepository approvalRequestRepository,
        IAuditLogRepository auditLogRepository,
        IUnitOfWork unitOfWork,
        IEnumerable<IApprovalNotifier> notifiers,
        ILogger<RegisterAgentCommandHandler> logger)
    {
        _agentRepository = agentRepository;
        _approvalRequestRepository = approvalRequestRepository;
        _auditLogRepository = auditLogRepository;
        _unitOfWork = unitOfWork;
        _notifiers = notifiers;
        _logger = logger;
    }

    public async Task<Guid> Handle(RegisterAgentCommand request, CancellationToken cancellationToken)
    {
        var agent = Agent.Register(request.Name, request.Type, request.Owner, request.Capabilities);

        var approvalRequest = ApprovalRequest.Create(
            agent.Id,
            ApprovalAction.CreateAgent,
            request.RequestedBy,
            request.Justification);

        agent.RequestApproval(ApprovalAction.CreateAgent);

        await _agentRepository.AddAsync(agent, cancellationToken);
        await _approvalRequestRepository.AddAsync(approvalRequest, cancellationToken);

        var auditEntry = AuditLogEntry.Create(
            agent.Id,
            approvalRequest.Id,
            "AgentRegistered",
            request.RequestedBy,
            request.Justification,
            $"Agent '{agent.Name}' of type '{agent.Type}' registered and queued for creation approval.");
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

        return agent.Id;
    }
}
