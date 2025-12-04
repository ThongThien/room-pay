// InvoiceService/Features/Invoice/IInvoiceService.cs

using InvoiceService.Models;
using InvoiceService.Features.Invoice.DTOs.Invoice; 
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
namespace InvoiceService.Features.Invoice;

public interface IInvoiceService
{
    // Các hàm cũ
    Task<IEnumerable<Models.Invoice>> GetAllInvoicesByUserAsync(string userId);
    Task<IEnumerable<Models.Invoice>> GetAllInvoicesByOwnerAsync(string ownerId, List<string> tenantUserIds);
    Task<Models.Invoice?> GetInvoiceByIdAsync(int id, string userId);
    Task<Models.Invoice?> GetInvoiceByIdAsync(int id); // Service-to-service call without userId filter
    Task<Models.Invoice> CreateInvoiceAsync(Models.Invoice invoice);
    Task<Models.Invoice?> UpdateInvoiceAsync(int id, Models.Invoice invoice, string userId);
    Task<bool> DeleteInvoiceAsync(int id, string userId);
    Task<Models.Invoice?> MarkInvoiceAsPaidAsync(int id, string userId);
    Task<Models.Invoice?> MarkInvoiceAsPaidAsync(int id); // Service-to-service call
    Task<IEnumerable<Models.Invoice>> GetInvoicesByStatusAsync(string userId, string status);
<<<<<<< HEAD
    Task<IEnumerable<Models.Invoice>> GetInvoicesByStatusForOwnerAsync(string ownerId, List<string> tenantUserIds, string status);
}
=======
    
    // ⭐ CÁC HÀM MỚI (Đã thêm vào Interface chính)
    Task<UnpaidInvoicesResponseDto> GetUnpaidInvoicesByTenantIdAsync(Guid tenantId);
    // Bạn cần thêm hàm này nếu bạn muốn tính tổng trả tháng trước
    Task<TotalPaidLastMonthDto> GetTotalPaidAmountLastMonthAsync(Guid tenantId); 
}
>>>>>>> thongthienv3
