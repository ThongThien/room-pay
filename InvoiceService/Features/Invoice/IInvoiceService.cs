using InvoiceService.Models;

namespace InvoiceService.Features.Invoice;

public interface IInvoiceService
{
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
    Task<IEnumerable<Models.Invoice>> GetInvoicesByStatusForOwnerAsync(string ownerId, List<string> tenantUserIds, string status);
}
