using Microsoft.EntityFrameworkCore;
using PropertyService.Models;
using PropertyService.Models.Enums;

namespace PropertyService.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<House> Houses => Set<House>();
    public DbSet<Room> Rooms => Set<Room>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Enum → string mapping
        modelBuilder.Entity<Room>()
            .Property(r => r.Status)
            .HasConversion<string>();

        // House → Rooms relationship
        modelBuilder.Entity<House>()
            .HasMany(h => h.Rooms)
            .WithOne(r => r.House)
            .HasForeignKey(r => r.HouseId)
            .OnDelete(DeleteBehavior.Cascade);

        base.OnModelCreating(modelBuilder);
    }
}
