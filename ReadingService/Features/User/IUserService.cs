using ReadingService.Features.User.DTOs;
public interface IUserService
{ 
    Task<List<string>> GetTenantIdsByOwnerAsync(string ownerId); // hàm lấy tenant id theo owner id

    Task<List<UserInfo>> GetUsersByIdsAsync(List<string> userIds); // hàm lấy thông tin user theo danh sách user id
}