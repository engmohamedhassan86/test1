using AgentOrchestrator.Application.Common.Interfaces;
using MediatR;

namespace AgentOrchestrator.Application.Agents.Queries.GetAgents;

public sealed class GetAgentsQueryHandler : IRequestHandler<GetAgentsQuery, IReadOnlyList<AgentSummaryDto>>
{
    private readonly IAgentRepository _agentRepository;

    public GetAgentsQueryHandler(IAgentRepository agentRepository)
    {
        _agentRepository = agentRepository;
    }

    public async Task<IReadOnlyList<AgentSummaryDto>> Handle(GetAgentsQuery request, CancellationToken cancellationToken)
    {
        var agents = await _agentRepository.ListAsync(cancellationToken);

        return agents
            .Select(agent => new AgentSummaryDto(
                agent.Id,
                agent.Name,
                agent.Type,
                agent.Owner,
                agent.Version,
                agent.Status,
                agent.Permission,
                agent.Capabilities,
                agent.CreatedAtUtc,
                agent.ActivatedAtUtc,
                agent.RetiredAtUtc))
            .ToList();
    }
}
