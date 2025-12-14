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

        // 1. Lấy danh sách
        public async Task<IEnumerable<Ticket>> GetTicketsAsync()
        {
            // Sắp xếp tin mới nhất lên đầu (OrderByDescending)
            return await _context.Tickets
                                 .OrderByDescending(t => t.CreatedAt)
                                 .ToListAsync();
        }

        // 2. Tạo mới
        public async Task<Ticket> CreateTicketAsync(CreateTicketDto dto)
        {
            var ticket = new Ticket
            {
                // Dùng ?? "" để đảm bảo không bị null nếu FE không gửi
                TenantId = dto.TenantId ?? string.Empty, 
                
                // Dùng ?? 0 nếu dto.RoomId là null (int?)
                RoomId = dto.RoomId ?? 0, 
                
                Title = dto.Title ?? "No Title",
                Description = dto.Description ?? "",
                Status = "pending", // Mặc định trạng thái ban đầu
                CreatedAt = DateTime.Now
            };

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();
            return ticket;
        }

        // 3. Cập nhật nội dung (Title, Description, RoomId)
        public async Task<bool> UpdateTicketContentAsync(int id, CreateTicketDto dto)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;

            // --- LOGIC QUAN TRỌNG: GIỮ NGUYÊN GIÁ TRỊ CŨ NẾU DỮ LIỆU MỚI LÀ NULL ---
            
            // Nếu dto.Title có dữ liệu -> Lấy cái mới. Nếu null -> Giữ cái cũ (ticket.Title)
            ticket.Title = !string.IsNullOrEmpty(dto.Title) ? dto.Title : ticket.Title;
            
            ticket.Description = !string.IsNullOrEmpty(dto.Description) ? dto.Description : ticket.Description;

            // Logic cho RoomId (int?): Chỉ update nếu có giá trị và khác 0
            if (dto.RoomId.HasValue && dto.RoomId.Value != 0)
            {
                ticket.RoomId = dto.RoomId.Value;
            }
            
            // Lưu ý: Không update Status ở hàm này để tránh xung đột logic

            await _context.SaveChangesAsync();
            return true;
        }

        // 4. Cập nhật trạng thái (Riêng biệt)
        public async Task<bool> UpdateTicketStatusAsync(int id, UpdateTicketStatusDto dto)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;

            ticket.Status = dto.Status;
            
            await _context.SaveChangesAsync();
            return true;
        }

        // 5. Xóa
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