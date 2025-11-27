using System.ComponentModel.DataAnnotations;
using backend_payroom.Features.User;

namespace backend_payroom.Features.Auth.DTOs;

public class RegisterDto
{
    [Required(ErrorMessage = "Full name is required")]
    [StringLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be between 6 and 100 characters")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone is required")]
    [Phone(ErrorMessage = "Invalid phone format")]
    public string Phone { get; set; } = string.Empty;
}
