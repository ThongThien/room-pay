using Microsoft.EntityFrameworkCore;
using ReadingService.Models;
using ReadingService.Models.Enums;

namespace ReadingService.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<ReadingCycle> ReadingCycles => Set<ReadingCycle>();
    public DbSet<MonthlyReading> MonthlyReadings => Set<MonthlyReading>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Enum → string mapping
        modelBuilder.Entity<ReadingCycle>()
            .Property(c => c.Status)
            .HasConversion<string>();

        modelBuilder.Entity<MonthlyReading>()
            .Property(m => m.Status)
            .HasConversion<string>();

        // ReadingCycle → MonthlyReadings (1-n)
        modelBuilder.Entity<ReadingCycle>()
            .HasMany(c => c.MonthlyReadings)
            .WithOne(m => m.Cycle)
            .HasForeignKey(m => m.CycleId)
            .OnDelete(DeleteBehavior.Cascade);

        base.OnModelCreating(modelBuilder);
    }
}
