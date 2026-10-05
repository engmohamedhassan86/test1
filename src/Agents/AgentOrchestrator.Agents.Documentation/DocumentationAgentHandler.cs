using AgentOrchestrator.Agents.Abstractions;
using AgentOrchestrator.Domain.Agents;

namespace AgentOrchestrator.Agents.Documentation;

/// <summary>
/// Phase 1 stub: defines the contract and response shape real static-analysis /
/// LLM-backed logic will fill in during Phase 3.
/// </summary>
public sealed class DocumentationAgentHandler : IAgentCapabilityHandler
{
    public AgentType SupportedType => AgentType.Documentation;

    public Task<AgentTaskResult> ExecuteAsync(AgentTaskRequest request, CancellationToken cancellationToken)
    {
        AgentTaskResult result = request.TaskName switch
        {
            "GenerateTechnicalDocs" => new AgentTaskResult(
                true,
                "Would generate/refresh architecture and how-it-works documentation from the current codebase.",
                new Dictionary<string, string> { ["pagesGenerated"] = "0" }),

            "GenerateApiDocs" => new AgentTaskResult(
                true,
                "Would generate API reference documentation from controller/route metadata.",
                new Dictionary<string, string> { ["endpointsDocumented"] = "0" }),

            _ => new AgentTaskResult(false, $"Task '{request.TaskName}' is not recognized by the Documentation agent.", null)
        };

        return Task.FromResult(result);
    }
}
