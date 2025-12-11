namespace PropertyService.Services.Clients
{
    public interface IUserServiceClient
    {
        Task<bool> CheckTenantExists(string tenantId);
        Task<object?> GetUserByIdAsync(string userId);
    }
}