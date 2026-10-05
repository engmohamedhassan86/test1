using MediatR;

namespace AgentOrchestrator.Application.Approvals.Queries.GetPendingApprovals;

public sealed record GetPendingApprovalsQuery : IRequest<IReadOnlyList<ApprovalRequestDto>>;
