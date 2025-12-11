using Microsoft.EntityFrameworkCore;
using TicketService.Models;

namespace TicketService.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Ticket> Tickets { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Cấu hình giống hệt SQL trong ảnh
            modelBuilder.Entity<Ticket>(entity =>
            {
                entity.Property(e => e.Status)
                      .HasDefaultValue("pending") // Default 'pending'
                      .IsRequired();

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP"); // Default TIMESTAMP
            });
        }
    }
}