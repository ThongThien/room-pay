using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend_payroom.Data;
using backend_payroom.Features.Auth.DTOs;
using backend_payroom.Features.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend_payroom.Features.Auth;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        // Check if email already exists
        if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email))
        {
            throw new InvalidOperationException("Email already exists");
        }

        var user = new UserModel
        {
            FullName = registerDto.FullName,
            Email = registerDto.Email,
            PasswordHash = HashPassword(registerDto.Password),
            Phone = registerDto.Phone,
            Role = UserRole.Tenant, // Always set to Tenant by default
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user.Id, user.Email, user.Role.ToString());
        var expiresAt = DateTime.UtcNow.AddMinutes(GetJwtExpirationMinutes());

        return new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            ExpiresAt = expiresAt
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email);
        
        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        if (!VerifyPassword(loginDto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        var token = GenerateJwtToken(user.Id, user.Email, user.Role.ToString());
        var expiresAt = DateTime.UtcNow.AddMinutes(GetJwtExpirationMinutes());

        return new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            ExpiresAt = expiresAt
        };
    }

    public string GenerateJwtToken(int userId, string email, string role)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(GetJwtExpirationMinutes()),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int GetJwtExpirationMinutes()
    {
        var expirationMinutes = _configuration.GetSection("JwtSettings")["ExpirationMinutes"];
        return int.TryParse(expirationMinutes, out var minutes) ? minutes : 60;
    }

    private static string HashPassword(string password)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    private static bool VerifyPassword(string password, string passwordHash)
    {
        var hashedInput = HashPassword(password);
        return hashedInput == passwordHash;
    }
}
