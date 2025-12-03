using Microsoft.EntityFrameworkCore;
using PaymentService.Models;

namespace PaymentService.Data;

public class PaymentDbContext : DbContext
{
    public PaymentDbContext(DbContextOptions<PaymentDbContext> options) : base(options)
    {
    }

    public DbSet<Transaction> Transactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tạo unique index cho SePayTransactionId để tránh trùng lặp
        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.SePayTransactionId)
            .IsUnique();

        // Index cho InvoiceNumber để tìm kiếm nhanh
        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.InvoiceNumber);

        // Index cho ReferenceNumber
        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.ReferenceNumber);
    }
}
