using AA.Features.Users.DTOs;
using AA.Models;
using System.Threading.Tasks;

namespace AA.Features.Users
{
    public interface IUserService
    {
        // Kiểm tra User ID có tồn tại và có liên kết với Owner (là Tenant) hay không
        // Kiểu dữ liệu userId là string để đồng bộ với IdentityUser.Id
        Task<bool> CheckTenantExistenceAndRoleAsync(string userId); 
        Task<ApplicationUser?> GetUserByIdAsync(string userId);
        
        // Quản lý người dùng cho Owner
        Task<UserResponseDto> CreateUserAsync(CreateUserDto createUserDto, string ownerId);
        Task<UserResponseDto> UpdateUserAsync(string userId, UpdateUserDto updateUserDto, string ownerId);
        Task<UserResponseDto> DeleteUserAsync(string userId, string ownerId);

        Task<List<ApplicationUser>> GetUsersByIdsBatchAsync(List<string> userIds);
    }
}