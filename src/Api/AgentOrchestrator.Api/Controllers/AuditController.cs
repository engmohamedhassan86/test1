using AgentOrchestrator.Application.Audit.Queries.GetAuditLog;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgentOrchestrator.Api.Controllers;

[ApiController]
[Route("api/audit")]
public sealed class AuditController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuditController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AuditLogEntryDto>>> GetAuditLog(CancellationToken ct)
    {
        var entries = await _mediator.Send(new GetAuditLogQuery(), ct);
        return Ok(entries);
    }
}
