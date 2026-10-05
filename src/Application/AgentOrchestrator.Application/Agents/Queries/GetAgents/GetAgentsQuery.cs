using MediatR;

namespace AgentOrchestrator.Application.Agents.Queries.GetAgents;

public sealed record GetAgentsQuery : IRequest<IReadOnlyList<AgentSummaryDto>>;
