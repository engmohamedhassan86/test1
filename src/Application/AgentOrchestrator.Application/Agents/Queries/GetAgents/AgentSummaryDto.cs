using AgentOrchestrator.Domain.Agents;

namespace AgentOrchestrator.Application.Agents.Queries.GetAgents;

public sealed record AgentSummaryDto(
    Guid Id,
    string Name,
    AgentType Type,
    string Owner,
    int Version,
    AgentStatus Status,
    AgentPermission Permission,
    IReadOnlyCollection<AgentCapability> Capabilities,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ActivatedAtUtc,
    DateTimeOffset? RetiredAtUtc);
