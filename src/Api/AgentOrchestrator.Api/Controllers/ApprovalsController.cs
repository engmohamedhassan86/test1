using AgentOrchestrator.Application.Approvals.Commands.DecideApproval;
using AgentOrchestrator.Application.Approvals.Queries.GetPendingApprovals;
using AgentOrchestrator.Application.Common.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgentOrchestrator.Api.Controllers;

/// <summary>
/// The "dashboard" approval channel the ticket requires: this REST API is itself the
/// functional dashboard backend for Phase 1 — a thin UI can be built against
/// <c>GET /api/approvals/pending</c> and <c>POST /api/approvals/{id}/decide</c> later
/// without any change to this controller.
/// </summary>
[ApiController]
[Route("api/approvals")]
public sealed class ApprovalsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentActor _currentActor;

    public ApprovalsController(IMediator mediator, ICurrentActor currentActor)
    {
        _mediator = mediator;
        _currentActor = currentActor;
    }

    [HttpGet("pending")]
    public async Task<ActionResult<IReadOnlyList<ApprovalRequestDto>>> GetPending(CancellationToken ct)
    {
        var pending = await _mediator.Send(new GetPendingApprovalsQuery(), ct);
        return Ok(pending);
    }

    [HttpPost("{id:guid}/decide")]
    public async Task<IActionResult> Decide(Guid id, [FromBody] DecideApprovalRequestBody body, CancellationToken ct)
    {
        await _mediator.Send(new DecideApprovalCommand(id, body.Approved, _currentActor.Name, body.Justification), ct);
        return NoContent();
    }
}

public sealed record DecideApprovalRequestBody(bool Approved, string Justification);
