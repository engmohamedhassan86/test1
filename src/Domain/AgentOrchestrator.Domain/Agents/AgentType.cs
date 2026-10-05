namespace AgentOrchestrator.Domain.Agents;

/// <summary>
/// The kind of work an agent is specialized for. This list is extensible: as the
/// framework grows, new agent types are added here (and a matching capability handler
/// project is added under <c>src/Agents</c>).
/// </summary>
public enum AgentType
{
    Developer = 0,
    QA = 1,
    DevOps = 2,
    Documentation = 3
}
