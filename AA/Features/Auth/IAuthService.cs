using backend_payroom.Features.Auth.DTOs;

namespace backend_payroom.Features.Auth;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
    string GenerateJwtToken(int userId, string email, string role);
}
