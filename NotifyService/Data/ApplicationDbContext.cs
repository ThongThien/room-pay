using Microsoft.EntityFrameworkCore;
using NotifyService.Models;

namespace NotifyService.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<Notification> Notifications => Set<Notification>();
}
