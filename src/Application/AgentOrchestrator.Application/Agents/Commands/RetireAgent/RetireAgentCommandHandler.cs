using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Audit;
using MediatR;

namespace AgentOrchestrator.Application.Agents.Commands.RetireAgent;

public sealed class RetireAgentCommandHandler : IRequestHandler<RetireAgentCommand>
{
    private readonly IAgentRepository _agentRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IUnitOfWork _unitOfWork;

    public RetireAgentCommandHandler(
        IAgentRepository agentRepository,
        IAuditLogRepository auditLogRepository,
        IUnitOfWork unitOfWork)
    {
        _agentRepository = agentRepository;
        _auditLogRepository = auditLogRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(RetireAgentCommand request, CancellationToken cancellationToken)
    {
        var agent = await _agentRepository.GetByIdAsync(request.AgentId, cancellationToken)
            ?? throw new InvalidOperationException($"Agent '{request.AgentId}' was not found.");

        agent.Retire();
        _agentRepository.Update(agent);

        var auditEntry = AuditLogEntry.Create(
            agent.Id,
            null,
            "AgentRetired",
            request.RequestedBy,
            request.Justification);
        await _auditLogRepository.AddAsync(auditEntry, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
