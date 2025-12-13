using Microsoft.EntityFrameworkCore;
using TicketService.Data;
using TicketService.Dtos;
using TicketService.Models;

namespace TicketService.Services
{
    public class TicketService : ITicketService
    {
        private readonly AppDbContext _context;

        public TicketService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Ticket>> GetTicketsAsync()
        {
            return await _context.Tickets.ToListAsync();
        }

        public async Task<Ticket> CreateTicketAsync(CreateTicketDto dto)
        {
            var ticket = new Ticket
            {
                TenantId = dto.TenantId ?? string.Empty, 
                
                RoomId = dto.RoomId ?? 0, // RoomId vẫn là int nên giữ nguyên số 0
                Title = dto.Title,
                Description = dto.Description,
                Status = "pending",
                CreatedAt = DateTime.Now
            };

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();
            return ticket;
        }

        public async Task<bool> UpdateTicketContentAsync(int id, CreateTicketDto dto)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;

            ticket.Title = dto.Title;
            ticket.Description = dto.Description;
            // Không update status ở hàm này

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateTicketStatusAsync(int id, UpdateTicketStatusDto dto)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;

            ticket.Status = dto.Status;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteTicketAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;

            _context.Tickets.Remove(ticket);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}