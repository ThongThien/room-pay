namespace PropertyService.Data;
using Microsoft.EntityFrameworkCore;
using PropertyService.Models; 
using PropertyService.Models.Enums;
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<House> Houses => Set<House>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<TenantContracts> TenantContracts { get; set; }
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

        modelBuilder.Entity<TenantContracts>()
            .Property(c => c.Status)
            .HasConversion<string>(); 

        base.OnModelCreating(modelBuilder);
    }
}
