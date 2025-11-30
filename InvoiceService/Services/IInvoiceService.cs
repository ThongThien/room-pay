using InvoiceService.Models;

namespace InvoiceService.Services;

public interface IInvoiceService
{
    Task<IEnumerable<Invoice>> GetAllInvoicesByUserAsync(string userId);
    Task<Invoice?> GetInvoiceByIdAsync(int id, string userId);
    Task<Invoice> CreateInvoiceAsync(Invoice invoice);
    Task<Invoice?> UpdateInvoiceAsync(int id, Invoice invoice, string userId);
    Task<bool> DeleteInvoiceAsync(int id, string userId);
    Task<Invoice?> MarkInvoiceAsPaidAsync(int id, string userId);
    Task<IEnumerable<Invoice>> GetInvoicesByStatusAsync(string userId, string status);
}