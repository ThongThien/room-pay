using System.Text;
using System.Text.Json;

namespace ReadingService.Services;

public class InvoiceHttpClient : IInvoiceHttpClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<InvoiceHttpClient> _logger;
    private readonly IConfiguration _configuration;

    public InvoiceHttpClient(
        HttpClient httpClient,
        ILogger<InvoiceHttpClient> logger,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<bool> CreateInvoiceForMonthlyReadingAsync(
        string userId, 
        int cycleId,
        int cycleMonth,
        int cycleYear,
        int electricUsage, 
        int waterUsage)
    {
        try
        {
            var invoiceServiceUrl = _configuration["Services:InvoiceService:BaseUrl"] 
            ?? throw new InvalidOperationException("InvoiceService BaseUrl not configured");
            if (string.IsNullOrEmpty(invoiceServiceUrl))
            {
                _logger.LogError("InvoiceService BaseUrl not configured");
                return false;
            }

            // Calculate due date as the last day of the current month
            var now = DateTime.UtcNow;
            var lastDayOfMonth = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month));

            var createInvoiceRequest = new CreateInvoiceRequest
            {
                UserId = userId,
                InvoiceDate = DateTime.UtcNow,
                DueDate = lastDayOfMonth,
                ElectricUsage = electricUsage,
                WaterUsage = waterUsage,
                CycleId = cycleId,
                CycleMonth = cycleMonth,
                CycleYear = cycleYear
            };

            var json = JsonSerializer.Serialize(createInvoiceRequest, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // Thêm API Key cho service-to-service authentication
            var apiKey = _configuration["Services:InvoiceService:ApiKey"];
            if (!string.IsNullOrEmpty(apiKey))
            {
                _httpClient.DefaultRequestHeaders.Remove("X-Service-Api-Key");
                _httpClient.DefaultRequestHeaders.Add("X-Service-Api-Key", apiKey);
            }

            var response = await _httpClient.PostAsync($"{invoiceServiceUrl}/api/Invoices", content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation($"Invoice created successfully for user {userId}, cycle {cycleId}");
                return true;
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Failed to create invoice: {response.StatusCode}, {error}");
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error creating invoice for user {userId}, cycle {cycleId}");
            return false;
        }
    }

    private class CreateInvoiceRequest
    {
        public string UserId { get; set; } = string.Empty;
        public DateTime InvoiceDate { get; set; }
        public DateTime DueDate { get; set; }
        public int ElectricUsage { get; set; }
        public int WaterUsage { get; set; }
        public int CycleId { get; set; }
        public int CycleMonth { get; set; }
        public int CycleYear { get; set; }
    }
}
