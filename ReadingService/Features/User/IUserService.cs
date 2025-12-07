public interface IUserService
{
    Task<List<string>> GetTenantIdsByOwnerAsync(string ownerId);
}