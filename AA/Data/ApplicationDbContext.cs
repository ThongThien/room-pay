using AA.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AA.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) 
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Identity sẽ tự động tạo các bảng với tên chuẩn:
        // - AspNetUsers (user accounts)
        // - AspNetRoles (roles)
        // - AspNetUserRoles (user-role relationships)
        // - AspNetUserClaims (user claims)
        // - AspNetUserLogins (external logins)
        // - AspNetUserTokens (authentication tokens)
        // - AspNetRoleClaims (role claims)
    }
}
