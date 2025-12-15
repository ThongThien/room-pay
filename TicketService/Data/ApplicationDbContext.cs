using Microsoft.EntityFrameworkCore;
using TicketService.Models;

namespace TicketService.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {

    }
    public DbSet<Ticket> Tickets { get; set; }
}