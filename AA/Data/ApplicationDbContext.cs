using Microsoft.EntityFrameworkCore;
using backend_payroom.Features.User;

namespace backend_payroom.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserModel> Users { get; set; } = null!;
}