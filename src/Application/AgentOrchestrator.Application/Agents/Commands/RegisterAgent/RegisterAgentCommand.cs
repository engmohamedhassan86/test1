using AgentOrchestrator.Domain.Agents;
using MediatR;

namespace AgentOrchestrator.Application.Agents.Commands.RegisterAgent;

/// <summary>
/// Registers a new agent in Draft status and immediately requests the mandatory
/// creation approval. The new agent is never created in anything other than
/// Draft/PendingApproval — see <see cref="RegisterAgentCommandHandler"/>.
/// </summary>
public sealed record RegisterAgentCommand(
    string Name,
    AgentType Type,
    string Owner,
    List<AgentCapability> Capabilities,
    string RequestedBy,
    string Justification) : IRequest<Guid>;
