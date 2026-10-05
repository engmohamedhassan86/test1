using MediatR;

namespace AgentOrchestrator.Application.Agents.Commands.RetireAgent;

/// <summary>
/// Retires an agent directly. Unlike create/activate/escalate/delete, retirement is
/// not approval-gated — any non-retired agent can be taken out of service immediately
/// (deletion of a retired agent is still approval-gated, see <c>DeleteAgentCommand</c>).
/// </summary>
public sealed record RetireAgentCommand(Guid AgentId, string RequestedBy, string Justification) : IRequest;
