using System.ComponentModel.DataAnnotations;

namespace AA.Features.Users.DTOs;

public class UpdateUserDto
{
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    public string? Email { get; set; }

    [MinLength(2, ErrorMessage = "Tên phải có ít nhất 2 ký tự")]
    public string? FullName { get; set; }

    [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự")]
    public string? Password { get; set; }

    public string? PhoneNumber {get; set;}
    public string? Role { get; set; }
}
