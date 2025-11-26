using backend_payroom.Data;
using backend_payroom.Features.User.DTOs;
using Microsoft.EntityFrameworkCore;

namespace backend_payroom.Features.User;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;

    public UserService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserResponseDto?> GetByIdAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        return user == null ? null : MapToResponseDto(user);
    }

    public async Task<IEnumerable<UserResponseDto>> GetAllAsync()
    {
        var users = await _context.Users.ToListAsync();
        return users.Select(MapToResponseDto);
    }

    public async Task<UserResponseDto> CreateAsync(CreateUserDto createUserDto)
    {
        // Check if email already exists
        if (await ExistsByEmailAsync(createUserDto.Email))
        {
            throw new InvalidOperationException("Email already exists");
        }

        var user = new UserModel
        {
            FullName = createUserDto.FullName,
            Email = createUserDto.Email,
            PasswordHash = HashPassword(createUserDto.Password), // In production, use proper password hashing like BCrypt
            Phone = createUserDto.Phone,
            Role = createUserDto.Role
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return MapToResponseDto(user);
    }

    public async Task<UserResponseDto?> UpdateAsync(int id, UpdateUserDto updateUserDto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return null;
        }

        // Check if email is being changed and if it already exists
        if (updateUserDto.Email != null && updateUserDto.Email != user.Email)
        {
            if (await ExistsByEmailAsync(updateUserDto.Email))
            {
                throw new InvalidOperationException("Email already exists");
            }
            user.Email = updateUserDto.Email;
        }

        if (updateUserDto.FullName != null)
        {
            user.FullName = updateUserDto.FullName;
        }

        if (updateUserDto.Phone != null)
        {
            user.Phone = updateUserDto.Phone;
        }

        if (updateUserDto.Role.HasValue)
        {
            user.Role = updateUserDto.Role.Value;
        }

        await _context.SaveChangesAsync();
        return MapToResponseDto(user);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return false;
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsByEmailAsync(string email)
    {
        return await _context.Users.AnyAsync(u => u.Email == email);
    }

    private static UserResponseDto MapToResponseDto(UserModel user)
    {
        return new UserResponseDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        };
    }

    // Simple password hashing for demonstration
    // In production, use BCrypt.Net-Next or ASP.NET Core Identity
    private static string HashPassword(string password)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashedBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }
}
