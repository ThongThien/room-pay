using System.ComponentModel.DataAnnotations;

namespace backend_payroom.Features.User.DTOs;

public class UpdateUserDto
{
    [StringLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
    public string? FullName { get; set; }

    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string? Email { get; set; }

    [Phone(ErrorMessage = "Invalid phone format")]
    public string? Phone { get; set; }

    public UserRole? Role { get; set; }
}
