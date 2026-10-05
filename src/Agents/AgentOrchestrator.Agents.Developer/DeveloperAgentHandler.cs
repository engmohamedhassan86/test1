using AgentOrchestrator.Agents.Abstractions;
using AgentOrchestrator.Domain.Agents;

namespace AgentOrchestrator.Agents.Developer;

/// <summary>
/// Phase 1 stub: defines the contract and response shape real static-analysis /
/// LLM-backed logic will fill in during Phase 3.
/// </summary>
public sealed class DeveloperAgentHandler : IAgentCapabilityHandler
{
    public AgentType SupportedType => AgentType.Developer;

    public Task<AgentTaskResult> ExecuteAsync(AgentTaskRequest request, CancellationToken cancellationToken)
    {
        AgentTaskResult result = request.TaskName switch
        {
            "CodeSuggestion" => new AgentTaskResult(
                true,
                "Would analyze the supplied diff/context and propose code changes (e.g. naming, null-safety, idiomatic patterns).",
                new Dictionary<string, string> { ["suggestionCount"] = "0" }),

            "RefactoringRecommendation" => new AgentTaskResult(
                true,
                "Would scan the target module for duplication, long methods, and coupling hotspots and recommend refactorings.",
                new Dictionary<string, string> { ["recommendationCount"] = "0" }),

            "ArchitectureReview" => new AgentTaskResult(
                true,
                "Would evaluate the proposed design against the solution's layering rules (Domain/Application/Infrastructure/Api) and flag violations.",
                new Dictionary<string, string> { ["violationCount"] = "0" }),

            _ => new AgentTaskResult(false, $"Task '{request.TaskName}' is not recognized by the Developer agent.", null)
        };

        return Task.FromResult(result);
    }
}
