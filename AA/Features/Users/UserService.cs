using AA.Data;
using AA.Features.Users.DTOs;
using AA.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

namespace AA.Features.Users
{
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public UserService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager) 
        {
            _userManager = userManager;
            _roleManager = roleManager;
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

        public async Task<UserResponseDto> CreateUserAsync(CreateUserDto createUserDto, string ownerId)
        {
            try
            {
                // Kiểm tra Owner có tồn tại không
                var owner = await _userManager.FindByIdAsync(ownerId);
                if (owner == null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Owner không tồn tại"
                    };
                }

                // Check if Owner has Owner role
                var ownerRoles = await _userManager.GetRolesAsync(owner);
                if (!ownerRoles.Contains("Owner"))
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Người dùng không có quyền Owner"
                    };
                }

                // Check if email already exists
                var existingUser = await _userManager.FindByEmailAsync(createUserDto.Email);
                if (existingUser != null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Email đã được sử dụng"
                    };
                }

                // Default role is Tenant
                const string defaultRole = "Tenant";

                // Generate random password
                var generatedPassword = GenerateRandomPassword();

                // Create new user
                var newUser = new ApplicationUser
                {
                    UserName = createUserDto.Email,
                    Email = createUserDto.Email,
                    FullName = createUserDto.FullName,
                    OwnerId = ownerId, // Set OwnerId to the creating owner's userId
                    CreatedAt = DateTime.UtcNow
                };

                var result = await _userManager.CreateAsync(newUser, generatedPassword);

                if (!result.Succeeded)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = string.Join(", ", result.Errors.Select(e => e.Description))
                    };
                }

                // Assign default Tenant role to user
                await _userManager.AddToRoleAsync(newUser, defaultRole);

                var roles = await _userManager.GetRolesAsync(newUser);

                return new UserResponseDto
                {
                    Success = true,
                    Message = "Tạo người dùng thành công",
                    GeneratedPassword = generatedPassword, // Trả về password đã tạo
                    Data = new UserData
                    {
                        Id = newUser.Id,
                        Email = newUser.Email!,
                        FullName = newUser.FullName!,
                        OwnerId = newUser.OwnerId,
                        Roles = roles.ToList(),
                        CreatedAt = newUser.CreatedAt
                    }
                };
            }
            catch (Exception ex)
            {
                return new UserResponseDto
                {
                    Success = false,
                    Message = $"Lỗi khi tạo người dùng: {ex.Message}"
                };
            }
        }

        private string GenerateRandomPassword()
        {
            const string lowercase = "abcdefghijklmnopqrstuvwxyz";
            const string uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const string digits = "0123456789";
            const string special = "@#$%^&*";
            const string allChars = lowercase + uppercase + digits + special;

            var random = new Random();
            var password = new char[12]; // Password length of 12 characters

            // Ensure at least one character of each type
            password[0] = lowercase[random.Next(lowercase.Length)];
            password[1] = uppercase[random.Next(uppercase.Length)];
            password[2] = digits[random.Next(digits.Length)];
            password[3] = special[random.Next(special.Length)];

            // Fill remaining characters
            for (int i = 4; i < password.Length; i++)
            {
                password[i] = allChars[random.Next(allChars.Length)];
            }

            // Shuffle password for better randomness
            for (int i = password.Length - 1; i > 0; i--)
            {
                int j = random.Next(i + 1);
                (password[i], password[j]) = (password[j], password[i]);
            }

            return new string(password);
        }

        public async Task<UserResponseDto> UpdateUserAsync(string userId, UpdateUserDto updateUserDto, string ownerId)
        {
            try
            {
                // Kiểm tra Owner có tồn tại không
                var owner = await _userManager.FindByIdAsync(ownerId);
                if (owner == null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Owner không tồn tại"
                    };
                }

                // Kiểm tra Owner có role Owner không
                var ownerRoles = await _userManager.GetRolesAsync(owner);
                if (!ownerRoles.Contains("Owner"))
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Người dùng không có quyền Owner"
                    };
                }

                // Tìm user cần update
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Người dùng không tồn tại"
                    };
                }

                // Kiểm tra user có thuộc owner này không
                if (user.OwnerId != ownerId)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Bạn không có quyền cập nhật người dùng này"
                    };
                }

                // Cập nhật thông tin
                if (!string.IsNullOrEmpty(updateUserDto.Email))
                {
                    var existingUser = await _userManager.FindByEmailAsync(updateUserDto.Email);
                    if (existingUser != null && existingUser.Id != userId)
                    {
                        return new UserResponseDto
                        {
                            Success = false,
                            Message = "Email đã được sử dụng"
                        };
                    }
                    user.Email = updateUserDto.Email;
                    user.UserName = updateUserDto.Email;
                }

                if (!string.IsNullOrEmpty(updateUserDto.FullName))
                {
                    user.FullName = updateUserDto.FullName;
                }

                user.UpdatedAt = DateTime.UtcNow;

                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = string.Join(", ", updateResult.Errors.Select(e => e.Description))
                    };
                }

                // Cập nhật mật khẩu nếu có
                if (!string.IsNullOrEmpty(updateUserDto.Password))
                {
                    var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                    var passwordResult = await _userManager.ResetPasswordAsync(user, token, updateUserDto.Password);
                    if (!passwordResult.Succeeded)
                    {
                        return new UserResponseDto
                        {
                            Success = false,
                            Message = "Cập nhật thành công nhưng không thể đổi mật khẩu: " + 
                                    string.Join(", ", passwordResult.Errors.Select(e => e.Description))
                        };
                    }
                }

                // Cập nhật role nếu có
                if (!string.IsNullOrEmpty(updateUserDto.Role))
                {
                    var roleExists = await _roleManager.RoleExistsAsync(updateUserDto.Role);
                    if (!roleExists)
                    {
                        return new UserResponseDto
                        {
                            Success = false,
                            Message = $"Role '{updateUserDto.Role}' không tồn tại"
                        };
                    }

                    var currentRoles = await _userManager.GetRolesAsync(user);
                    await _userManager.RemoveFromRolesAsync(user, currentRoles);
                    await _userManager.AddToRoleAsync(user, updateUserDto.Role);
                }

                var roles = await _userManager.GetRolesAsync(user);

                return new UserResponseDto
                {
                    Success = true,
                    Message = "Cập nhật người dùng thành công",
                    Data = new UserData
                    {
                        Id = user.Id,
                        Email = user.Email!,
                        FullName = user.FullName!,
                        OwnerId = user.OwnerId,
                        Roles = roles.ToList(),
                        CreatedAt = user.CreatedAt,
                        UpdatedAt = user.UpdatedAt
                    }
                };
            }
            catch (Exception ex)
            {
                return new UserResponseDto
                {
                    Success = false,
                    Message = $"Lỗi khi cập nhật người dùng: {ex.Message}"
                };
            }
        }

        public async Task<UserResponseDto> DeleteUserAsync(string userId, string ownerId)
        {
            try
            {
                // Kiểm tra Owner có tồn tại không
                var owner = await _userManager.FindByIdAsync(ownerId);
                if (owner == null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Owner không tồn tại"
                    };
                }

                // Kiểm tra Owner có role Owner không
                var ownerRoles = await _userManager.GetRolesAsync(owner);
                if (!ownerRoles.Contains("Owner"))
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Người dùng không có quyền Owner"
                    };
                }

                // Tìm user cần xóa
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Người dùng không tồn tại"
                    };
                }

                // Kiểm tra user có thuộc owner này không
                if (user.OwnerId != ownerId)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Bạn không có quyền xóa người dùng này"
                    };
                }

                // Không cho phép xóa chính mình
                if (user.Id == ownerId)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Không thể xóa chính bạn"
                    };
                }

                var result = await _userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = string.Join(", ", result.Errors.Select(e => e.Description))
                    };
                }

                return new UserResponseDto
                {
                    Success = true,
                    Message = "Xóa người dùng thành công"
                };
            }
            catch (Exception ex)
            {
                return new UserResponseDto
                {
                    Success = false,
                    Message = $"Lỗi khi xóa người dùng: {ex.Message}"
                };
            }
        }
    }
}