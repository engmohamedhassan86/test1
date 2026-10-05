namespace AgentOrchestrator.Application.Common.Interfaces;

/// <summary>
/// Who is making the current request — a stand-in for real authentication/identity.
/// Infrastructure/Api provides an HTTP-header-based implementation for Phase 1.
/// </summary>
public interface ICurrentActor
{
    string Name { get; }
}
