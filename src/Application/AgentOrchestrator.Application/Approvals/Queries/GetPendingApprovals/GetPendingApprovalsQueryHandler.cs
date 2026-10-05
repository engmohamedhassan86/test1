using AgentOrchestrator.Application.Common.Interfaces;
using MediatR;

namespace AgentOrchestrator.Application.Approvals.Queries.GetPendingApprovals;

public sealed class GetPendingApprovalsQueryHandler
    : IRequestHandler<GetPendingApprovalsQuery, IReadOnlyList<ApprovalRequestDto>>
{
    private readonly IApprovalRequestRepository _approvalRequestRepository;

    public GetPendingApprovalsQueryHandler(IApprovalRequestRepository approvalRequestRepository)
    {
        _approvalRequestRepository = approvalRequestRepository;
    }

    public async Task<IReadOnlyList<ApprovalRequestDto>> Handle(
        GetPendingApprovalsQuery request, CancellationToken cancellationToken)
    {
        var pending = await _approvalRequestRepository.ListPendingAsync(cancellationToken);

        return pending
            .Select(r => new ApprovalRequestDto(
                r.Id,
                r.AgentId,
                r.Action,
                r.Status,
                r.RequestedBy,
                r.RequestedAtUtc,
                r.Justification,
                r.RequestedPermission,
                r.DecidedBy,
                r.DecidedAtUtc,
                r.DecisionJustification))
            .ToList();
    }
}
