using System.Net;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text.Json; 

namespace PropertyService.Services.Clients
{
    public class UserServiceClient : IUserServiceClient
    {
        private readonly HttpClient _httpClient;

        public UserServiceClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<bool> CheckTenantExists(string tenantId) 
        {
            var response = await _httpClient.GetAsync($"/api/users/{tenantId}/exists");

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

        public async Task<object?> GetUserByIdAsync(string userId) 
        {
            // Endpoint: GET /api/users/{userId} 
            var response = await _httpClient.GetAsync($"/api/users/{userId}");

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                
                try
                {
                    return JsonSerializer.Deserialize<object>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
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