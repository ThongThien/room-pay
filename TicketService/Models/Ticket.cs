using TicketService.Models.Enums;

namespace TicketService.Models;

public class Ticket
{
    public int Id { get; set; }

    public string? TenantId { get; set; } 

    public string? OwnerId { get; set; }

    public int ContractId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public TicketStatus Status { get; set; } = TicketStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    public DateTime ClosedAt { get; set; }
}