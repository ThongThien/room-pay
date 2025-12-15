namespace AA.Features.Users.DTOs;

public class UserResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserData? Data { get; set; }
    public string? GeneratedPassword { get; set; } // Password ngẫu nhiên được tạo
}

public class UserData
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? OwnerId { get; set; }
    public List<string> Roles { get; set; } = new();

    public string? PhoneNumber {get; set;}
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
