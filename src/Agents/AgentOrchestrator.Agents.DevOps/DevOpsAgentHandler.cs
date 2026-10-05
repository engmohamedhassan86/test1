using AgentOrchestrator.Agents.Abstractions;
using AgentOrchestrator.Domain.Agents;

namespace AgentOrchestrator.Agents.DevOps;

/// <summary>
/// Phase 1 stub: defines the contract and response shape real static-analysis /
/// LLM-backed logic will fill in during Phase 3.
/// </summary>
public sealed class DevOpsAgentHandler : IAgentCapabilityHandler
{
    public AgentType SupportedType => AgentType.DevOps;

    public Task<AgentTaskResult> ExecuteAsync(AgentTaskRequest request, CancellationToken cancellationToken)
    {
        AgentTaskResult result = request.TaskName switch
        {
            "MonitorPipeline" => new AgentTaskResult(
                true,
                "Would poll the CI/CD pipeline status and surface failures or stuck stages.",
                new Dictionary<string, string> { ["pipelineStatus"] = "unknown" }),

            "ValidateDeployment" => new AgentTaskResult(
                true,
                "Would verify a deployment's health checks and rollout status post-release.",
                new Dictionary<string, string> { ["healthy"] = "unknown" }),

            "InfrastructureCheck" => new AgentTaskResult(
                true,
                "Would validate infrastructure-as-code against drift and policy baselines.",
                new Dictionary<string, string> { ["driftDetected"] = "unknown" }),

            _ => new AgentTaskResult(false, $"Task '{request.TaskName}' is not recognized by the DevOps agent.", null)
        };

        return Task.FromResult(result);
    }
}
