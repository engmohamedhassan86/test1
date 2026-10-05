namespace AgentOrchestrator.Agents.Abstractions;

public interface IAgentCapabilityHandler
{
    AgentOrchestrator.Domain.Agents.AgentType SupportedType { get; }
    Task<AgentTaskResult> ExecuteAsync(AgentTaskRequest request, CancellationToken cancellationToken);
}
