using backend_payroom.Features.User.DTOs;

namespace backend_payroom.Features.User;

public interface IUserService
{
    Task<UserResponseDto?> GetByIdAsync(int id);
    Task<IEnumerable<UserResponseDto>> GetAllAsync();
    Task<UserResponseDto> CreateAsync(CreateUserDto createUserDto);
    Task<UserResponseDto?> UpdateAsync(int id, UpdateUserDto updateUserDto);
    Task<bool> DeleteAsync(int id);
    Task<bool> ExistsByEmailAsync(string email);
}
