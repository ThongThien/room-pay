using ReadingService.Features.User.DTOs;
using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;


namespace ReadingService.Features.User; // Đổi namespace cho phù hợp

public class UserService : IUserService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<UserService> _logger;
    private readonly IConfiguration _configuration;

    public UserService(HttpClient httpClient, ILogger<UserService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = configuration;
        
        var baseUrl = configuration ["AuthService:BaseUrl"] 
            ?? throw new InvalidOperationException("AuthService:BaseUrl not configured");
        _httpClient.BaseAddress = new Uri(baseUrl);
        
        var apiKey = configuration["AuthService:ApiKey"] ?? configuration["ServiceApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Service-Api-Key", apiKey);
        }
    }
    
    // --- CHỈ CẦN TRIỂN KHAI HÀM LẤY DANH SÁCH TENANT ID ---

    public async Task<List<string>> GetTenantIdsByOwnerAsync(string ownerId)
    {
        try
        {
            // Endpoint tương tự như trong code InvoiceService: /api/users/owner/{ownerId}/tenants
            var response = await _httpClient.GetAsync($"/api/users/owner/{ownerId}/tenants");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get users by owner {OwnerId}. Status: {StatusCode}", 
                    ownerId, response.StatusCode);
                return new List<string>();
            }

            var content = await response.Content.ReadAsStringAsync();
            
            // Dùng List<UserInfo> để Deserialize như trong code bạn cung cấp
            var users = JsonSerializer.Deserialize<List<UserInfo>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            // Lấy ra danh sách ID từ các UserInfo
            return users?.Select(u => u.Id).ToList() ?? new List<string>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AuthService to get users by owner {OwnerId}", ownerId);
            return new List<string>();
        }
    }
}