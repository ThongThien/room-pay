using System.ComponentModel.DataAnnotations;

namespace AA.Features.Users.DTOs;

public class CreateUserDto
{
    [Required(ErrorMessage = "Email là bắt buộc")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tên đầy đủ là bắt buộc")]
    [MinLength(2, ErrorMessage = "Tên phải có ít nhất 2 ký tự")]
    public string FullName { get; set; } = string.Empty;
}
