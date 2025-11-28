using Microsoft.EntityFrameworkCore;
using InvoiceService.Models;

namespace InvoiceService.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Mapping Enum to string
        modelBuilder.Entity<Invoice>()
            .Property(i => i.Status)
            .HasConversion<string>();

        // Relationship
        modelBuilder.Entity<Invoice>()
            .HasMany(i => i.Items)
            .WithOne(it => it.Invoice)
            .HasForeignKey(it => it.InvoiceId);

        base.OnModelCreating(modelBuilder);
    }
}