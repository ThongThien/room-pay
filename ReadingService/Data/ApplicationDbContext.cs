using Microsoft.EntityFrameworkCore;
using ReadingService.Models;

namespace ReadingService.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Các DbSet cho từng bảng
        public DbSet<ReadingCycle> ReadingCycles { get; set; }
        public DbSet<MonthlyReading> MonthlyReadings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Thiết lập quan hệ: 1 ReadingCycle có 1 MonthlyReading
            modelBuilder.Entity<ReadingCycle>()
                .HasOne(rc => rc.MonthlyReading)
                .WithOne(mr => mr.ReadingCycle)
                .HasForeignKey<MonthlyReading>(mr => mr.CycleId)
                .OnDelete(DeleteBehavior.Cascade);

            // Tạo unique index cho CycleId trong MonthlyReading
            modelBuilder.Entity<MonthlyReading>()
                .HasIndex(mr => mr.CycleId)
                .IsUnique();

            // Cấu hình Status enum được lưu dưới dạng string
            modelBuilder.Entity<MonthlyReading>()
                .Property(mr => mr.Status)
                .HasConversion<string>();
        }
    }
}