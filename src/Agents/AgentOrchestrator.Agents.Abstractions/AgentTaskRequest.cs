namespace AgentOrchestrator.Agents.Abstractions;

public sealed record AgentTaskRequest(Guid AgentId, string TaskName, IReadOnlyDictionary<string, string> Parameters);
