// File: InvoiceService/Features/Property/PropertyServiceClientImpl.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using InvoiceService.Features.Property.DTOs; 
using System.Net.Http.Json; 
using System.Text;

namespace InvoiceService.Features.Property;

public class PropertyServiceClientImpl : IPropertyService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PropertyServiceClientImpl> _logger;
    private readonly JsonSerializerOptions _jsonSerializerOptions; 
    
    // ... (Constructor giữ nguyên)
    public PropertyServiceClientImpl(HttpClient httpClient, 
                                     ILogger<PropertyServiceClientImpl> logger,
                                     IConfiguration configuration) 
    {
        _httpClient = httpClient;
        _logger = logger;
        
        _jsonSerializerOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        
        var baseUrl = configuration.GetSection("PropertyService")["BaseUrl"];
        if (string.IsNullOrEmpty(baseUrl))
        {
            _logger.LogError("PropertyService:BaseUrl not configured in appsettings.json or environment variables.");
            throw new InvalidOperationException("PropertyService:BaseUrl not configured");
        }
        
        _httpClient.BaseAddress = new Uri(baseUrl);
        _logger.LogInformation("PropertyService Client Base URL set to: {BaseUrl}", baseUrl);
        
        var apiKey = configuration.GetSection("PropertyService")["ApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Service-Api-Key", apiKey);
            _logger.LogInformation("PropertyService Client ApiKey header added.");
        }
    }


   public async Task<List<PropertyDetailsDto>> GetDetailsByContractIdsAsync(List<ContractIdsRequestDto> contractIds)
    {
        if (contractIds == null || !contractIds.Any())
        {
            return new List<PropertyDetailsDto>();
        }

        try
        {
            var apiUrl = "api/property/details-by-contracts"; 
            
            // ĐÃ SỬA: Chuyển đổi List<ContractIdsRequestDto> thành List<int>
            var onlyIds = contractIds.Select(d => d.ContractId).ToList();
            
            // Serialize LIST<INT> (chứ không phải List DTO)
            var jsonContent = JsonSerializer.Serialize(onlyIds); //  SỬ DỤNG onlyIds
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _logger.LogInformation("➡️ PropertyService Client: Requesting property details for {Count} contracts.", onlyIds.Count);

            var response = await _httpClient.PostAsync(apiUrl, content);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("🔥 Property Service failed to get details. Status {Status}. Content: {Error}", 
                    response.StatusCode, errorContent);
                return new List<PropertyDetailsDto>();
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            
            // Deserialize kết quả
            var result = JsonSerializer.Deserialize<List<PropertyDetailsDto>>(responseContent, _jsonSerializerOptions);
            
            _logger.LogInformation("✅ PropertyService Client: Successfully received {Count} property details.", result?.Count ?? 0);
            
            return result ?? new List<PropertyDetailsDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 Error calling PropertyService for batch property details.");
            return new List<PropertyDetailsDto>();
        }
    }
    //  HÀM MỚI: Triển khai GetActiveContractIdByUserIdAsync
    public async Task<int?> GetActiveContractIdByUserIdAsync(string userId)
    {
        // Giả định: Property Service có endpoint này
        var apiUrl = $"api/property/active-id/{userId}"; 
        
        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("PropertyService Client: UserId is null or empty. Cannot look up active contract.");
            return null;
        }

        try
        {
            _logger.LogInformation("➡️ PropertyService Client: Requesting active contract ID for User: {UserId}", userId);

            var response = await _httpClient.GetAsync(apiUrl);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("🔥 Property Service failed to get active contract for {UserId}. Status {Status}. Content: {Error}", 
                    userId, response.StatusCode, errorContent);
                // Trả về null nếu có lỗi hoặc không tìm thấy
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            
            // Endpoint trả về JSON string: "CONTRACT-XYZ"
            if (string.IsNullOrEmpty(content) || content.Equals("null", StringComparison.OrdinalIgnoreCase))
            {
                 _logger.LogWarning("⚠️ PropertyService Client: No active contract found for user {UserId}.", userId);
                 return null;
            }
            if (int.TryParse(content.Trim().Replace("\"", ""), out int contractIdInt))
                {
                    _logger.LogInformation("✅ PropertyService Client: Found active Contract ID: {ContractId} for user {UserId}", contractIdInt, userId);
                    return contractIdInt; // Trả về kiểu int
                }
                else
                {
                    // Xử lý trường hợp không thể chuyển đổi (dữ liệu rác)
                    _logger.LogError("🔥 PropertyService Client: Failed to parse Contract ID '{Content}' to integer for user {UserId}.", content, userId);
                    return null;
                }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 Error calling PropertyService to get active contract for {UserId}.", userId);
            return null;
        }
    }
}