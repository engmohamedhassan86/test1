using AgentOrchestrator.Application.Common.Interfaces;

namespace AgentOrchestrator.Infrastructure;

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
