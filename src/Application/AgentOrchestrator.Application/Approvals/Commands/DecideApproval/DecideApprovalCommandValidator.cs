using FluentValidation;

namespace AgentOrchestrator.Application.Approvals.Commands.DecideApproval;

public sealed class DecideApprovalCommandValidator : AbstractValidator<DecideApprovalCommand>
{
    public DecideApprovalCommandValidator()
    {
        RuleFor(x => x.DecidedBy).NotEmpty();
        RuleFor(x => x.Justification).NotEmpty();
    }
}
