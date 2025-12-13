using InvoiceService.Services.DTOs;

namespace InvoiceService.Services;

public interface IUserServiceClient
{
    Task<UserInfo?> GetUserInfoAsync(string userId);
    Task<List<string>> GetUserIdsByOwnerAsync(string ownerId);
    Task<List<UserInfo>> GetTenantsByOwnerIdAsync(string ownerId);

    Task<List<string>> GetAllOwnerIdsAsync();
}
