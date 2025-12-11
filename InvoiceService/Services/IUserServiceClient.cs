using InvoiceService.Services.DTOs;

namespace InvoiceService.Services;

public interface IUserServiceClient
{
    Task<UserInfo?> GetUserInfoAsync(string userId);
    Task<List<string>> GetUserIdsByOwnerAsync(string ownerId);
}
