using InvoiceService.Services.DTOs;
using System.Text.Json;

namespace InvoiceService.Services;

public class UserServiceClient : IUserServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<UserServiceClient> _logger;

    public UserServiceClient(HttpClient httpClient, ILogger<UserServiceClient> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        
        var baseUrl = configuration ["AuthService:BaseUrl"] 
            ?? throw new InvalidOperationException("AuthService:BaseUrl not configured");
        _httpClient.BaseAddress = new Uri(baseUrl);
        
        var apiKey = configuration["AuthService:ApiKey"] ?? configuration["ServiceApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Service-Api-Key", apiKey);
        }
    }

    public async Task<UserInfo?> GetUserInfoAsync(string userId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/users/{userId}");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get user info for userId {UserId}. Status: {StatusCode}", 
                    userId, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var userInfo = JsonSerializer.Deserialize<UserInfo>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return userInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AuthService to get user info for userId {UserId}", userId);
            return null;
        }
    }

    public async Task<List<string>> GetUserIdsByOwnerAsync(string ownerId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/users/owner/{ownerId}/tenants");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get users by owner {OwnerId}. Status: {StatusCode}", 
                    ownerId, response.StatusCode);
                return new List<string>();
            }

            var content = await response.Content.ReadAsStringAsync();
            var users = JsonSerializer.Deserialize<List<UserInfo>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return users?.Select(u => u.Id).ToList() ?? new List<string>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AuthService to get users by owner {OwnerId}", ownerId);
            return new List<string>();
        }
    }

    public async Task<List<UserInfo>> GetTenantsByOwnerIdAsync(string ownerId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/users/owner/{ownerId}/tenants");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get tenants by owner {OwnerId}. Status: {StatusCode}", 
                    ownerId, response.StatusCode);
                return new List<UserInfo>();
            }

            var content = await response.Content.ReadAsStringAsync();
            var users = JsonSerializer.Deserialize<List<UserInfo>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            // ⭐️ Trả về List<UserInfo> đầy đủ
            return users ?? new List<UserInfo>(); 
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AuthService to get tenants by owner {OwnerId}", ownerId);
            return new List<UserInfo>();
        }
    }

    public async Task<List<string>> GetAllOwnerIdsAsync()
    {
        try
        {
            _logger.LogInformation("Calling AAService to retrieve all active Owner IDs.");

            // Endpoint này giả định được thiết kế để chỉ trả về danh sách Owner có Tenants đang Active
            var response = await _httpClient.GetAsync("api/users/owners");
            
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
