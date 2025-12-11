using System.Collections.Generic;
using System.Threading.Tasks;

namespace PropertyService.Services.Clients
{
    public interface IUserServiceClient
    {
        Task<bool> CheckTenantExists(string tenantId);
        Task<Dictionary<string, object>?> GetUserByIdAsync(string userId);
    }
}