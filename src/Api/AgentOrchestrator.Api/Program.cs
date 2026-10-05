using AgentOrchestrator.Api.Identity;
using AgentOrchestrator.Api.Middleware;
using AgentOrchestrator.Application;
using AgentOrchestrator.Application.Common.Interfaces;
using AgentOrchestrator.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentActor, HeaderBasedCurrentActor>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.MapControllers();

app.MapGet("/health", () => Results.Ok("healthy"));

app.Run();

public partial class Program
{
}
