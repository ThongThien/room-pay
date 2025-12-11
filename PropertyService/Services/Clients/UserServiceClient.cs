using System.Net;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text.Json; 
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;

namespace PropertyService.Services.Clients
{
    public class UserServiceClient : IUserServiceClient
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public UserServiceClient(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public async Task<bool> CheckTenantExists(string tenantId) 
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/users/{tenantId}/exists");
            request.Headers.Add("X-Service-Api-Key", _configuration["ServiceApiKey"]);

            var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                return true;
            }
            
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return false;
            }
            
            // Xử lý lỗi khác
            return false; 
        }

        public async Task<Dictionary<string, object>?> GetUserByIdAsync(string userId) 
        {
            // Endpoint: GET /api/users/{userId} 
            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/users/{userId}");
            request.Headers.Add("X-Service-Api-Key", _configuration["ServiceApiKey"]);

            var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                
                try
                {
                    return JsonSerializer.Deserialize<Dictionary<string, object>>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
                catch (JsonException)
                {
                    return null;
                }
            }
            return null;
        }
    }
}