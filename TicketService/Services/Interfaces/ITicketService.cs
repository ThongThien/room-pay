using TicketService.Dtos;   
using TicketService.Models; // Hoặc Models

namespace TicketService.Services
{
    public interface ITicketService
    {
        Task<IEnumerable<Ticket>> GetTicketsAsync(); // Lấy danh sách
        Task<Ticket> CreateTicketAsync(CreateTicketDto dto); // Tạo mới
        Task<bool> UpdateTicketContentAsync(int id, CreateTicketDto dto); // Sửa nội dung (Title, Desc)
        Task<bool> UpdateTicketStatusAsync(int id, UpdateTicketStatusDto dto); // Sửa trạng thái
        Task<bool> DeleteTicketAsync(int id); // Xóa
    }
}