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
        
        // BaseAddress is already configured in Program.cs HttpClient registration
        // Add API key header
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

    public async Task<List<UserInfo>> GetUsersByIdsAsync(List<string> userIds)
    {
        // Giả sử AuthService/UserService có endpoint POST để nhận List<string> và trả về List<UserInfo>
        var apiUrl = "/api/users/batch-info"; 

        try
        {
            // Gửi danh sách userIds qua Body bằng POST
            var response = await _httpClient.PostAsJsonAsync(apiUrl, userIds);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get batch user info. Status: {StatusCode}", response.StatusCode);
                return new List<UserInfo>();
            }

            var content = await response.Content.ReadAsStringAsync();
            
            var users = JsonSerializer.Deserialize<List<UserInfo>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            // Trả về danh sách UserInfo (chứa Id và FullName)
            return users ?? new List<UserInfo>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AuthService to get batch user info");
            return new List<UserInfo>();
        }
    }

    // ⭐️ TRIỂN KHAI HÀM LẤY OWNER ID ⭐️
    public async Task<string?> GetOwnerIdByTenantIdAsync(string tenantId)
    {
        try
        {
            // Giả định AA Service có endpoint /api/users/tenant/{tenantId}/owner-id
            var response = await _httpClient.GetAsync($"/api/users/tenant/{tenantId}/owner-id");

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                // Server trả về string ID thuần, không cần Deserialize phức tạp
                return content.Trim('"'); // Loại bỏ dấu nháy kép nếu response là JSON string
            }
            
            _logger.LogWarning("Failed to get owner ID for tenant {TenantId}. Status: {StatusCode}", tenantId, response.StatusCode);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AuthService to get owner ID for tenant {TenantId}", tenantId);
            return null;
        }
    }

    // ⭐️ TRIỂN KHAI HÀM LẤY EMAIL OWNER ⭐️
    public async Task<string?> GetEmailByUserIdAsync(string userId)
    {
        try
        {
            // AA Service có endpoint /api/users/{userId} và trả về DTO
            var response = await _httpClient.GetAsync($"/api/users/{userId}");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                
                // Endpoint /api/users/{userId} trả về object có chứa 'email' (xem UsersController)
                var userInfo = JsonSerializer.Deserialize<UserInfo>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                return userInfo?.Email;
            }

            _logger.LogWarning("Failed to get email for user {UserId}. Status: {StatusCode}", userId, response.StatusCode);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AuthService to get email for user {UserId}", userId);
            return null;
        }
    }

    public async Task<List<string>> GetAllOwnerIdsAsync()
    {
        try
        {
            _logger.LogInformation("Calling AAService to retrieve all active Owner IDs.");

            // Endpoint này giả định được thiết kế để chỉ trả về danh sách Owner có Tenants đang Active
            var response = await _httpClient.GetAsync("api/user/owners-with-active-contracts");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                
                // Giả định API trả về List<string>
                var ownerIds = JsonSerializer.Deserialize<List<string>>(
                    content, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (ownerIds == null || ownerIds.Count == 0)
                {
                    _logger.LogWarning("AAService returned 0 active Owner IDs.");
                }

                return ownerIds ?? new List<string>();
            }
            else
            {
                _logger.LogError("Failed to retrieve Owner IDs from AAService. Status Code: {StatusCode}", response.StatusCode);
                return new List<string>();
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed while retrieving Owner IDs from AAService.");
            return new List<string>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unexpected error occurred while processing GetAllOwnerIdsAsync.");
            return new List<string>();
        }
    }

    
}