using TicketService.Models.Enums;

namespace TicketService.Features.Tickets.DTOs;

public class TicketDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public int ContractId { get; set; }
    public string? HouseName { get; set; }
    public string? RoomName { get; set; }
    public string? TenantName { get; set; }
}