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
        
        var baseUrl = configuration["AuthService:BaseUrl"] ?? "http://localhost:5000";
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
}
