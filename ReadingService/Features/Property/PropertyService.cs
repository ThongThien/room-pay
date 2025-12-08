// File: ReadingService/Features/Property/PropertyService.cs

using System.Text.Json;
using ReadingService.Features.Property.DTOs;
using System.Net.Http.Json; 

namespace ReadingService.Features.Property;

public class PropertyService : IPropertyService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PropertyService> _logger;
    // Cần IConfiguration để đọc BaseUrl và API Key
    private readonly IConfiguration _configuration; 

    public PropertyService(HttpClient httpClient, ILogger<PropertyService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = configuration;
        
        // --- CẤU HÌNH HTTP CLIENT ---
        var baseUrl = configuration["PropertyService:BaseUrl"] 
            ?? throw new InvalidOperationException("PropertyService:BaseUrl not configured");
        _httpClient.BaseAddress = new Uri(baseUrl);
        
        // Cấu hình API Key cho S2S (Service-to-Service)
        var apiKey = configuration["ServiceApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Service-Api-Key", apiKey);
        }
    }

    public async Task<List<PropertyDetailsDto>> GetDetailsByContractIdsAsync(List<int> contractIds) // ⭐ ĐÃ SỬA
    {
        var apiUrl = "api/property/details-by-contracts"; // ⭐ Endpoint đã làm việc

        if (contractIds == null || !contractIds.Any()) // ⭐ ĐÃ SỬA
        {
            _logger.LogWarning("PropertyService Client: Input list is null or empty. Skipping API call.");
            return new List<PropertyDetailsDto>();
        }

        try
        {
            // 1. Dùng List<int> làm Body
            var response = await _httpClient.PostAsJsonAsync(apiUrl, contractIds); // ⭐ Dùng contractIds

            if (!response.IsSuccessStatusCode)
            {
                // ... (Logic xử lý lỗi giữ nguyên)
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("🔥 Property Service failed with status {Status}. Content: {Error}", 
                    response.StatusCode, errorContent);
                return new List<PropertyDetailsDto>();
            }

            // ... (Logic deserialize giữ nguyên)
            var content = await response.Content.ReadAsStringAsync();
            var details = JsonSerializer.Deserialize<List<PropertyDetailsDto>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            
            return details ?? new List<PropertyDetailsDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 Error calling PropertyService batch endpoint.");
            return new List<PropertyDetailsDto>();
        }
    }
}