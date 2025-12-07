// File: ReadingService/Features/Property/PropertyService.cs

using System.Text.Json;
using ReadingService.Features.Property.DTOs;
using System.Net.Http.Json; 

namespace ReadingService.Features.Property;

public class PropertyService : IPropertyService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PropertyService> _logger;

    public PropertyService(HttpClient httpClient, ILogger<PropertyService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        
        // --- CẤU HÌNH HTTP CLIENT (Tương tự như UserService) ---
        var baseUrl = configuration ["PropertyService:BaseUrl"] 
            ?? throw new InvalidOperationException("PropertyService:BaseUrl not configured");
        _httpClient.BaseAddress = new Uri(baseUrl);
        
        // Cấu hình API Key nếu cần
        var apiKey = configuration["PropertyService:ApiKey"] ?? configuration["ServiceApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Service-Api-Key", apiKey);
        }
    }

    public async Task<Dictionary<int, PropertyDetailsDto>> GetDetailsByCycleIdsAsync(List<int> cycleIds)
    {
        // Giả sử Property Service có endpoint POST nhận vào List<int> CycleIds và trả về Map
        var apiUrl = "/api/properties/details-by-cycles"; 

        try
        {
            // Sử dụng PostAsJsonAsync để gửi danh sách IDs qua Body
            var response = await _httpClient.PostAsJsonAsync(apiUrl, cycleIds);

            if (response.IsSuccessStatusCode)
            {
                // Giả sử Property Service trả về List<PropertyDetailsDto>
                var content = await response.Content.ReadAsStringAsync();
                
                var detailsList = JsonSerializer.Deserialize<List<PropertyDetailsDto>>(
                    content, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (detailsList == null) return new Dictionary<int, PropertyDetailsDto>();
                
                // Chuyển List thành Dictionary<CycleId, PropertyDetailsDto> để dễ dàng tra cứu (lookup)
                return detailsList.ToDictionary(d => d.CycleId, d => d);
            }
            
            _logger.LogError("Lỗi gọi PropertyService API. Status: {Status}", response.StatusCode);
            return new Dictionary<int, PropertyDetailsDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi kết nối khi gọi PropertyService API");
            return new Dictionary<int, PropertyDetailsDto>();
        }
    }
}