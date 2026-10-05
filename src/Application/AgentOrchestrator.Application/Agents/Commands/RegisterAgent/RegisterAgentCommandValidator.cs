using FluentValidation;

namespace AgentOrchestrator.Application.Agents.Commands.RegisterAgent;

public sealed class RegisterAgentCommandValidator : AbstractValidator<RegisterAgentCommand>
{
    public RegisterAgentCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
        RuleFor(x => x.Owner).NotEmpty();
        RuleFor(x => x.RequestedBy).NotEmpty();
        RuleFor(x => x.Justification).NotEmpty();
        RuleFor(x => x.Capabilities).NotEmpty();
    }
}
