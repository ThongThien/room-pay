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

    public async Task<List<PropertyDetailsDto>> GetDetailsByCycleUserIdsAsync(
    List<CycleUserIdsRequestDto> cycleUserIds)
    {
        var apiUrl = "api/property/details-by-cycles"; 

        if (cycleUserIds == null || !cycleUserIds.Any())
        {
            _logger.LogWarning("PropertyService Client: Input list is null or empty. Skipping API call.");
            return new List<PropertyDetailsDto>();
        }

        try
        {
            // ⭐ LOG 1: Kiểm tra dữ liệu đầu vào (Outbound Check) ⭐
            var firstReq = cycleUserIds.FirstOrDefault();
            _logger.LogInformation("➡️ PropertyService Client: Requesting details for {Count} cycle-user pairs. Example: Cycle={Cycle}, User={User} (Length={Length})", 
                cycleUserIds.Count, firstReq?.CycleId ?? 0, firstReq?.UserId ?? "NULL", firstReq?.UserId?.Length ?? 0);
            
            // Gửi request POST với List<CycleUserIdsRequestDto> trong Body
            var response = await _httpClient.PostAsJsonAsync(apiUrl, cycleUserIds);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("🔥 Property Service failed with status {Status}. Content: {Error}", 
                    response.StatusCode, errorContent);
                return new List<PropertyDetailsDto>();
            }

            var content = await response.Content.ReadAsStringAsync();
            
            // ⭐ LOG 2: Kiểm tra nội dung thô (Raw Content Check) ⭐
            _logger.LogInformation("✅ PropertyService Client: Received content successfully. Content length: {Length}. Trying to deserialize...", 
                content.Length);
                
            // Sử dụng JsonSerializerOptions để không phân biệt chữ hoa/thường (đề phòng lỗi ánh xạ tên trường)
            var details = JsonSerializer.Deserialize<List<PropertyDetailsDto>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            
            // ⭐ LOG 3: Kiểm tra kết quả deserialization (Inbound Check) ⭐
            if (details == null || !details.Any())
            {
                // Nếu độ dài nội dung là 2, nó là "[]" rỗng từ Property Service
                if (content.Length <= 2)
                {
                    _logger.LogWarning("⚠️ PropertyService Client: Deserialization result is empty (0 items). Raw content indicates Property Service returned '[]'.");
                }
                else
                {
                    _logger.LogError("🛑 Deserialization Failed: Result is null/empty but Content Length is {Length}. Check DTO definition in Reading Service. Raw Content: {Content}", 
                        content.Length, content.Substring(0, Math.Min(100, content.Length))); // Hiển thị 100 ký tự đầu
                }
            }
            else
            {
                var firstDetail = details.FirstOrDefault();
                _logger.LogInformation("✅ PropertyService Client: Deserialized {Count} items. First item: Cycle={Cycle}, House={House}, Room={Room}", 
                    details.Count, firstDetail.CycleId, firstDetail.HouseName, firstDetail.RoomName);
            }
            
            return details ?? new List<PropertyDetailsDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 Error calling PropertyService batch endpoint.");
            return new List<PropertyDetailsDto>();
        }
    }
}