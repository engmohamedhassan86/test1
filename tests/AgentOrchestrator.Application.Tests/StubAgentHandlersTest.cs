using AgentOrchestrator.Agents.Abstractions;
using AgentOrchestrator.Agents.Documentation;
using AgentOrchestrator.Agents.DevOps;
using AgentOrchestrator.Agents.Developer;
using AgentOrchestrator.Agents.QA;
using AgentOrchestrator.Domain.Agents;
using org.junit.jupiter.api.Test;

namespace AgentOrchestrator.Application.Tests;

/// <summary>
/// Phase 1 capability-agent contract smoke tests: every stub handler answers its
/// supported tasks and refuses unknown tasks, so the dispatch contract is pinned
/// before real logic lands in Phase 3.
/// </summary>
public sealed class StubAgentHandlersTest
{
    @Test
    public async Task eachStubAgentServesItsSupportedTypeAndRecognizedTasks()
    {
        await VerifyTasks(new DeveloperAgentHandler(), AgentType.Developer,
            List<string>.Of("CodeSuggestion", "RefactoringRecommendation", "ArchitectureReview"));

        await VerifyTasks(new QAAgentHandler(), AgentType.QA,
            List<string>.Of("GenerateTestCases", "ExecuteAutomatedTests", "QualityReport"));

        await VerifyTasks(new DevOpsAgentHandler(), AgentType.DevOps,
            List<string>.Of("MonitorPipeline", "ValidateDeployment", "InfrastructureCheck"));

        await VerifyTasks(new DocumentationAgentHandler(), AgentType.Documentation,
            List<string>.Of("GenerateTechnicalDocs", "GenerateApiDocs"));
    }

    @Test
    public async Task unknownTaskIsReportedAsFailure()
    {
        var developer = new DeveloperAgentHandler();

        var result = await AwaitResult(developer, "DoTheLaundry");

        Assertions.assertFalse(result.Success);
        Assertions.assertNull(result.Outputs);
    }

    private static async Task VerifyTasks(
        IAgentCapabilityHandler handler,
        AgentType expectedType,
        List<string> recognizedTasks)
    {
        Assertions.assertEquals(expectedType, handler.SupportedType);

        foreach (var taskName in recognizedTasks)
        {
            var result = await AwaitResult(handler, taskName);
            Assertions.assertTrue(result.Success, "Expected task to be recognized: " + taskName);
            Assertions.assertFalse(result.Summary.IsNullOrWhiteSpace);
            Assertions.assertNotNull(result.Outputs);
        }
    }

    private static async Task<AgentTaskResult> AwaitResult(
        IAgentCapabilityHandler handler,
        string taskName)
    {
        var request = new AgentTaskRequest(Guid.NewGuid(), taskName, new Dictionary<string, string>());
        return await handler.ExecuteAsync(request, CancellationToken.None);
    }
}