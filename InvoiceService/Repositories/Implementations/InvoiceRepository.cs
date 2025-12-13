// InvoiceService/Repositories/Implementations/InvoiceRepository.cs

using InvoiceService.Models; 
using InvoiceService.Data; 
using InvoiceService.Repositories.Interfaces; 
using Microsoft.EntityFrameworkCore; // Cần cho ToListAsync, FirstOrDefaultAsync, SaveChangesAsync
using System.Linq; 
using System.Threading.Tasks; 
using InvoiceService.Models.Enums;

namespace InvoiceService.Repositories.Implementations
{
    public class InvoiceRepository : IInvoiceRepository
    {
        private readonly ApplicationDbContext _context; 

        public InvoiceRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public IQueryable<Invoice> Query()
        {
            return _context.Invoices.AsQueryable(); 
        }

        //  TRIỂN KHAI HÀM ADD ASYNC
        public async Task AddAsync(Invoice entity)
        {
            await _context.Invoices.AddAsync(entity);
            await _context.SaveChangesAsync();
        }

        //  TRIỂN KHAI HÀM UPDATE ASYNC
        public Task UpdateAsync(Invoice entity)
        {
            // Update sẽ đánh dấu Entity là Modified và lưu thay đổi
            _context.Invoices.Update(entity);
            return _context.SaveChangesAsync();
        }

        //  TRIỂN KHAI HÀM DELETE ASYNC
        public Task DeleteAsync(Invoice entity)
        {
            // Remove sẽ đánh dấu Entity là Deleted và lưu thay đổi
            _context.Invoices.Remove(entity);
            return _context.SaveChangesAsync();
        }
        
        //  TRIỂN KHAI GET BY ID ASYNC (Tùy chọn)
        public Task<Invoice?> GetByIdAsync(int id)
        {
            return _context.Invoices.FirstOrDefaultAsync(i => i.Id == id);
        }

        // public async Task<Invoice?> GetOverdueInvoiceDetailsAsync(int id)
        // {
        //     // Logic truy vấn DBear: Tìm hóa đơn theo ID và kiểm tra điều kiện quá hạn
        //     return await Query()
        //         .Where(i => i.Id == id && 
        //                     i.Status != InvoiceStatus.Paid && // Chưa thanh toán
        //                     i.DueDate < DateTime.UtcNow)     // Đã quá hạn
        //         .FirstOrDefaultAsync();
        // }

        public async Task<List<Invoice>> GetInvoicesByOwnerIdAsync(string ownerId)
        {
            // For now, return all invoices - in a real implementation, 
            // you would need to join with property service to filter by owner
            // Since we don't have direct relationship, we'll return all invoices
            // and filter in the service layer
            return await _context.Invoices.ToListAsync();
        }

        public async Task<List<Invoice>> GetUnpaidInvoicesByUserIdAsync(string userId)
        {
            // Lọc theo UserId và Status = "Unpaid" (hoặc Enum InvoiceStatus.Unpaid)
            return await _context.Invoices
                .Include(i => i.Items) // Tùy chọn: nếu bạn cần chi tiết item trong hóa đơn
                .Where(i => i.UserId == userId && i.Status == InvoiceStatus.Unpaid.ToString())
                // Hoặc nếu Status là Enum (như bạn đã định nghĩa)
                // .Where(i => i.UserId == userId && i.Status == InvoiceStatus.Unpaid.ToString())
                .ToListAsync();
        }

        public async Task<List<Invoice>> GetInvoicesForReportAsync(DateTime startDate)
        {
            // Lấy tất cả hóa đơn có InvoiceDate, DueDate, hoặc PaidDate nằm trong phạm vi báo cáo
            return await _context.Invoices
                .Where(i => i.InvoiceDate >= startDate || 
                            (i.PaidDate.HasValue && i.PaidDate.Value >= startDate) ||
                            i.DueDate >= startDate)
                .ToListAsync();
        }
    }
}