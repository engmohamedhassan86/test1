namespace AgentOrchestrator.Domain.Exceptions;

/// <summary>
/// Base type for all exceptions raised by domain invariant violations.
/// </summary>
public abstract class DomainException : Exception
{
    protected DomainException(string message) : base(message)
    {
    }

    protected DomainException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
