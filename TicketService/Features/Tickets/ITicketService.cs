using TicketService.Features.Tickets.DTOs;
using TicketService.Models;

namespace TicketService.Features.Tickets;

public interface ITicketService
{
    Task<Ticket> CreateTicketAsync(string userId, CreateTicketDto dto);
    Task<IEnumerable<TicketDto>> GetTicketsByTenantIdAsync(string tenantId);
    Task<IEnumerable<TicketDto>> GetTicketsByOwnerIdAsync(string ownerId);
    Task<bool> CloseTicketAsync(int ticketId, string userId);
    Task<bool> AcceptTicketAsync(int ticketId, string ownerId);
}