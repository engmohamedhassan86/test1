namespace AgentOrchestrator.Agents.Abstractions;

public sealed record AgentTaskResult(bool Success, string Summary, IReadOnlyDictionary<string, string>? Outputs);
