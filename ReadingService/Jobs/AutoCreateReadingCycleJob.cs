using Quartz;
using ReadingService.Features.ReadingCycle;
using ReadingService.Features.ReadingCycle.DTOs;

namespace ReadingService.Jobs;

public class AutoCreateReadingCycleJob : IJob
{
    private readonly IReadingCycleService _readingCycleService;
    private readonly ILogger<AutoCreateReadingCycleJob> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public AutoCreateReadingCycleJob(
        IReadingCycleService readingCycleService,
        ILogger<AutoCreateReadingCycleJob> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _readingCycleService = readingCycleService;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("Starting auto creation of reading cycles on {Date}", DateTime.Now);

        try
        {
            // Get all tenants from AA service
            var tenants = await GetAllTenantsAsync();
            if (tenants == null || !tenants.Any())
            {
                _logger.LogWarning("No tenants found for auto creation");
                return;
            }

            // Calculate next month
            var now = DateTime.Now;
            var nextMonth = now.AddMonths(1);
            var cycleMonth = nextMonth.Month;
            var cycleYear = nextMonth.Year;

            _logger.LogInformation("Creating reading cycles for {Month}/{Year} for {Count} tenants", cycleMonth, cycleYear, tenants.Count);

            foreach (var tenant in tenants)
            {
                try
                {
                    // Check if cycle already exists
                    var exists = await _readingCycleService.ExistsAsync(tenant.Id, cycleMonth, cycleYear);
                    if (exists)
                    {
                        _logger.LogInformation("Reading cycle already exists for tenant {TenantId} for {Month}/{Year}", tenant.Id, cycleMonth, cycleYear);
                        continue;
                    }

                    var cycle = await _readingCycleService.CreateAsync(tenant.Id, new CreateReadingCycleDto
                    {
                        CycleMonth = cycleMonth,
                        CycleYear = cycleYear
                    });
                    _logger.LogInformation("Created reading cycle {Id} for tenant {TenantId}", cycle.Id, tenant.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error creating reading cycle for tenant {TenantId}", tenant.Id);
                }
            }

            _logger.LogInformation("Completed auto creation of reading cycles");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in auto creation job");
        }
    }

    private async Task<List<TenantDto>?> GetAllTenantsAsync()
    {
        var client = _httpClientFactory.CreateClient("AA");
        var apiKey = _configuration["ServiceApiKey"];

        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("ServiceApiKey not configured");
            return null;
        }

        client.DefaultRequestHeaders.Add("X-Service-Api-Key", apiKey);

        try
        {
            var response = await client.GetAsync("api/users/tenants");
            if (response.IsSuccessStatusCode)
            {
                var tenants = await response.Content.ReadFromJsonAsync<List<TenantDto>>();
                return tenants;
            }
            else
            {
                _logger.LogError("Failed to get tenants: {StatusCode}", response.StatusCode);
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AA service for tenants");
            return null;
        }
    }
}

public class TenantDto
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? OwnerId { get; set; }
}