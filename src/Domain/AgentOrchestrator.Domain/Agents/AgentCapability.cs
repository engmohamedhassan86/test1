using AgentOrchestrator.Domain.Common;

namespace AgentOrchestrator.Domain.Agents;

/// <summary>
/// Describes one capability an agent is declared to have (e.g. "CodeSuggestion").
/// Capabilities are descriptive metadata; they do not themselves grant permission —
/// see <see cref="AgentPermission"/> for the escalatable permission level.
/// </summary>
public sealed record AgentCapability
{
    public string Name { get; }
    public string Description { get; }

    public AgentCapability(string name, string description)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Capability name must not be empty.", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            throw new ArgumentException("Capability description must not be empty.", nameof(description));
        }

        Name = name;
        Description = description;
    }
}
