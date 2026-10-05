using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Infrastructure.Notifications;
using AgentOrchestrator.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace AgentOrchestrator.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers the in-memory persistence seam and the approval-notifier fan-out.
    /// Repositories are singletons because they wrap <see cref="System.Collections.Concurrent.ConcurrentDictionary{TKey,TValue}"/>
    /// in-memory stores that must be shared across the app's lifetime.
    ///
    /// Notifier design note: rather than introducing a CompositeApprovalNotifier that
    /// itself implements <see cref="IApprovalNotifier"/> (which would have to be
    /// carefully excluded from its own fan-out list to avoid infinite recursion),
    /// every concrete channel adapter is registered directly as an
    /// <see cref="IApprovalNotifier"/>, and Application-layer command handlers depend on
    /// <see cref="IEnumerable{IApprovalNotifier}"/> and loop over all of them,
    /// catching and logging exceptions per-notifier so one failing channel never blocks
    /// another.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IAgentRepository, InMemoryAgentRepository>();
        services.AddSingleton<IApprovalRequestRepository, InMemoryApprovalRequestRepository>();
        services.AddSingleton<IAuditLogRepository, InMemoryAuditLogRepository>();
        services.AddSingleton<IUnitOfWork, InMemoryUnitOfWork>();

        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        services.AddSingleton<IApprovalNotifier, LoggingApprovalNotifier>();
        services.AddSingleton<IApprovalNotifier, TeamsApprovalNotifier>();
        services.AddSingleton<IApprovalNotifier, EmailApprovalNotifier>();

        return services;
    }
}
