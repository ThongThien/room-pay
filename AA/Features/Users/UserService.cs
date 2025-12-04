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
            var user = await _userManager.FindByIdAsync(userId);
            
            if (user == null)
            {
                return false; 
            }
            if (!string.IsNullOrEmpty(user.OwnerId))
            {
                return true; 
            }
            return false;
        }
        public async Task<ApplicationUser?> GetUserByIdAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            return user;
        }
    }
}