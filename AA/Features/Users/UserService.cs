using AA.Data;
using AA.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

namespace AA.Features.Users
{
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;

        // UserService cần UserManager để truy vấn User và các thuộc tính liên quan (OwnerId)
        public UserService(UserManager<ApplicationUser> userManager) 
        {
            _userManager = userManager;
        }

        public async Task<bool> CheckTenantExistenceAndRoleAsync(string userId)
        {
            // 1. Kiểm tra User có tồn tại không
            var user = await _userManager.FindByIdAsync(userId);
            
            if (user == null)
            {
                return false; // User không tồn tại
            }

            // 2. KIỂM TRA VAI TRÒ (Tenant Role Check)
            // Logic: User là Tenant nếu nó có giá trị trong trường OwnerId.
            // (Chắc chắn rằng OwnerId được fetch khi FindByIdAsync hoặc bạn phải dùng DbContext Include)
            
            if (!string.IsNullOrEmpty(user.OwnerId))
            {
                // Nếu có OwnerId, đây là một Tenant hợp lệ được PropertyService chấp nhận
                return true; 
            }
            
            // Nếu không có OwnerId (ví dụ: là Owner, Admin, hoặc user chưa gán role)
            return false;
        }
        public async Task<ApplicationUser?> GetUserByIdAsync(string userId)
        {
            // UserManager có phương thức FindByIdAsync để làm việc này
            // Lưu ý: User Manager tự động truy vấn dữ liệu từ DB (DbContext)
            var user = await _userManager.FindByIdAsync(userId);
            return user;
            // Nếu bạn muốn trả về DTO, hãy map kết quả ở đây: return _mapper.Map<UserDto>(user);
        }
    }
}