// InvoiceService/Repositories/Interfaces/IInvoiceRepository.cs

using InvoiceService.Models; 
using System.Linq; // Cần cho IQueryable
using System.Threading.Tasks; // Cần cho Task

namespace InvoiceService.Repositories.Interfaces
{
    public interface IInvoiceRepository
    {
        // Hàm Query đã có
        IQueryable<Invoice> Query(); 
        
        //  BỔ SUNG CÁC HÀM CRUD BỊ THIẾU
        Task AddAsync(Invoice entity);
        Task UpdateAsync(Invoice entity); // Cần để fix lỗi CS1061
        Task DeleteAsync(Invoice entity); // Cần để fix lỗi CS1061
        
        // Bạn có thể thêm GetByIdAsync (tùy chọn)
        Task<Invoice?> GetByIdAsync(int id);
        Task<List<Invoice>> GetInvoicesByOwnerIdAsync(string ownerId);
        // Task<Invoice?> GetOverdueInvoiceDetailsAsync(int id); // Lấy chi tiết hóa đơn quá hạn

        Task<List<Invoice>> GetUnpaidInvoicesByUserIdAsync(string userId);
    }
}