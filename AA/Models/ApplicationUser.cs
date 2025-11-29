using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;

namespace AA.Models;

public class ApplicationUser : IdentityUser
{
    public string? FullName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public string? OwnerId { get; set; }
    public ApplicationUser? Owner { get; set; }
    public ICollection<ApplicationUser> Tenants { get; set; } = new List<ApplicationUser>();
}
