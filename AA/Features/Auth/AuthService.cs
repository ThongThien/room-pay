using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AA.Features.Auth.DTOs;
using AA.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace AA.Features.Auth;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _configuration;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        // Kiểm tra email đã tồn tại
        var existingUser = await _userManager.FindByEmailAsync(registerDto.Email);
        if (existingUser != null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Email đã được sử dụng"
            };
        }

        ApplicationUser? owner = null;
        if (!string.IsNullOrWhiteSpace(registerDto.OwnerId))
        {
            owner = await _userManager.FindByIdAsync(registerDto.OwnerId);
            if (owner == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Owner không tồn tại"
                };
            }
        }

        // Tạo user mới
        var user = new ApplicationUser
        {
            UserName = registerDto.Email,
            Email = registerDto.Email,
            FullName = registerDto.FullName,
            CreatedAt = DateTime.UtcNow,
            OwnerId = owner?.Id
        };

        var result = await _userManager.CreateAsync(user, registerDto.Password);

        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = string.Join(", ", result.Errors.Select(e => e.Description))
            };
        }

        // Tự động gán role "Tenant" cho user mới
        const string defaultRole = "Tenant";
        var roleResult = await _userManager.AddToRoleAsync(user, defaultRole);
        if (!roleResult.Succeeded)
        {
            // Nếu gán role thất bại, xóa user đã tạo
            await _userManager.DeleteAsync(user);
            return new AuthResponseDto
            {
                Success = false,
                Message = "Không thể gán role cho user: " + string.Join(", ", roleResult.Errors.Select(e => e.Description))
            };
        }

        // Tạo token
        var token = await GenerateJwtTokenAsync(user);

        return new AuthResponseDto
        {
            Success = true,
            Message = "Đăng ký thành công",
            Token = token,
            User = new UserInfoDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName ?? string.Empty,
                Role = defaultRole,
                OwnerId = user.OwnerId
            }
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        var user = await _userManager.FindByEmailAsync(loginDto.Email);
        if (user == null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Email hoặc mật khẩu không đúng"
            };
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, loginDto.Password, false);
        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Email hoặc mật khẩu không đúng"
            };
        }

        var token = await GenerateJwtTokenAsync(user);
        var roles = await _userManager.GetRolesAsync(user);

        return new AuthResponseDto
        {
            Success = true,
            Message = "Đăng nhập thành công",
            Token = token,
            User = new UserInfoDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName ?? string.Empty,
                Role = roles.FirstOrDefault() ?? string.Empty,
                OwnerId = user.OwnerId
            }
        };
    }

    private async Task<string> GenerateJwtTokenAsync(ApplicationUser user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret không được cấu hình");

        // Lấy roles của user
        var roles = await _userManager.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("fullName", user.FullName ?? string.Empty)
        };

        if (!string.IsNullOrEmpty(user.OwnerId))
        {
            claims.Add(new Claim("ownerId", user.OwnerId));
        }

        // Thêm roles vào claims
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expirationMinutes = int.Parse(jwtSettings["ExpirationMinutes"] ?? "1440");

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
