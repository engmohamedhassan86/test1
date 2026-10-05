using AgentOrchestrator.Domain.Audit;
using org.junit.jupiter.api.Test;

namespace AgentOrchestrator.Domain.Tests;

/// <summary>
/// Guards the audit trail contract: every governed action must be recorded with an
/// actor, a timestamp, and (where applicable) a justification — and entries are
/// immutable once created.
/// </summary>
public sealed class AuditLogEntryTest
{
    @Test
    void createRecordsActorActionAndTimestamp()
    {
        var entry = AuditLogEntry.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "AgentRegistered",
            "requestor",
            "Please review this new agent.");

        Assertions.assertNotNull(entry.Id);
        Assertions.assertEquals("AgentRegistered", entry.Action);
        Assertions.assertEquals("requestor", entry.PerformedBy);
        Assertions.assertNotNull(entry.OccurredAtUtc);
        Assertions.assertEquals("Please review this new agent.", entry.Justification);
    }

    @Test
    void createRejectsEmptyAction()
    {
        Assertions.assertThrows(
            ArgumentException.class,
            () => AuditLogEntry.Create(null, null, string.Empty, "requestor"));
    }

    @Test
    void createRejectsEmptyPerformer()
    {
        Assertions.assertThrows(
            ArgumentException.class,
            () => AuditLogEntry.Create(null, null, "AgentRegistered", string.Empty));
    }
}