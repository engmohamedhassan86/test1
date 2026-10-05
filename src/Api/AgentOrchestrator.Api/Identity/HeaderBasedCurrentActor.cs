using AgentOrchestrator.Application.Common.Interfaces;

namespace AgentOrchestrator.Api.Identity;

/// <summary>
/// Phase 1 stand-in for real authentication: reads the caller's name from an
/// <c>X-Actor-Name</c> header. Lives in the Api project (rather than Infrastructure)
/// because it depends on <see cref="IHttpContextAccessor"/>, an ASP.NET Core concept
/// that Infrastructure deliberately stays free of.
/// </summary>
public sealed class HeaderBasedCurrentActor : ICurrentActor
{
    private const string ActorHeaderName = "X-Actor-Name";

    private readonly IHttpContextAccessor _httpContextAccessor;

    public HeaderBasedCurrentActor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string Name
    {
        get
        {
            var headerValue = _httpContextAccessor.HttpContext?.Request.Headers[ActorHeaderName].ToString();
            return string.IsNullOrWhiteSpace(headerValue) ? "unknown" : headerValue;
        }
    }
}
