using AgentOrchestrator.Application.Agents.Commands.ActivateAgent;
using AgentOrchestrator.Application.Agents.Commands.DeleteAgent;
using AgentOrchestrator.Application.Agents.Commands.EscalatePermission;
using AgentOrchestrator.Application.Agents.Commands.RegisterAgent;
using AgentOrchestrator.Application.Agents.Commands.RetireAgent;
using AgentOrchestrator.Application.Agents.Queries.GetAgents;
using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Domain.Agents;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgentOrchestrator.Api.Controllers;

[ApiController]
[Route("api/agents")]
public sealed class AgentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentActor _currentActor;

    public AgentsController(IMediator mediator, ICurrentActor currentActor)
    {
        _mediator = mediator;
        _currentActor = currentActor;
    }

    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterAgentRequestBody body, CancellationToken ct)
    {
        var capabilities = body.Capabilities
            .Select(c => new AgentCapability(c.Name, c.Description))
            .ToList();

        var command = new RegisterAgentCommand(
            body.Name,
            body.Type,
            body.Owner,
            capabilities,
            _currentActor.Name,
            body.Justification);

        var agentId = await _mediator.Send(command, ct);

        return Created($"/api/agents/{agentId}", new { id = agentId });
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AgentSummaryDto>>> GetAgents(CancellationToken ct)
    {
        var agents = await _mediator.Send(new GetAgentsQuery(), ct);
        return Ok(agents);
    }

    [HttpPost("{id:guid}/activate-request")]
    public async Task<IActionResult> RequestActivation(Guid id, [FromBody] JustificationRequestBody body, CancellationToken ct)
    {
        await _mediator.Send(new ActivateAgentCommand(id, _currentActor.Name, body.Justification), ct);
        return Accepted();
    }

    [HttpPost("{id:guid}/escalate-request")]
    public async Task<IActionResult> RequestEscalation(Guid id, [FromBody] EscalatePermissionRequestBody body, CancellationToken ct)
    {
        await _mediator.Send(
            new EscalatePermissionCommand(id, body.RequestedPermission, _currentActor.Name, body.Justification),
            ct);
        return Accepted();
    }

    [HttpPost("{id:guid}/retire")]
    public async Task<IActionResult> Retire(Guid id, [FromBody] JustificationRequestBody body, CancellationToken ct)
    {
        await _mediator.Send(new RetireAgentCommand(id, _currentActor.Name, body.Justification), ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/delete-request")]
    public async Task<IActionResult> RequestDeletion(Guid id, [FromBody] JustificationRequestBody body, CancellationToken ct)
    {
        await _mediator.Send(new DeleteAgentCommand(id, _currentActor.Name, body.Justification), ct);
        return Accepted();
    }
}

public sealed record RegisterAgentRequestBody(
    string Name,
    AgentType Type,
    string Owner,
    List<CapabilityDto> Capabilities,
    string Justification);

public sealed record CapabilityDto(string Name, string Description);

public sealed record JustificationRequestBody(string Justification);

public sealed record EscalatePermissionRequestBody(AgentPermission RequestedPermission, string Justification);
