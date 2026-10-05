FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY src/ src/
RUN dotnet restore "src/Api/AgentOrchestrator.Api/AgentOrchestrator.Api.csproj"

WORKDIR /src/src/Api/AgentOrchestrator.Api
RUN dotnet publish "AgentOrchestrator.Api.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "AgentOrchestrator.Api.dll"]
