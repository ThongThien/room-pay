// InvoiceService/Features/Invoice/IInvoiceService.cs

using InvoiceService.Models;
using InvoiceService.Features.Invoice.DTOs.Invoice; 
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InvoiceService.Features.Invoice.DTOs; 
namespace InvoiceService.Features.Invoice;

public interface IInvoiceService
{
// Old functions
    Task<IEnumerable<InvoiceResponse>> GetAllInvoicesByUserAsync(string userId);
    Task<IEnumerable<InvoiceResponse>> GetAllInvoicesByOwnerAsync(string ownerId, List<string> tenantUserIds);
    Task<IEnumerable<InvoiceResponse>> GetAllInvoicesByOwnerAsync(string ownerId, List<string> tenantUserIds, int page, int pageSize, string? status, int? year, int? month);
    Task<IEnumerable<InvoiceResponse>> GetInvoicesByTenantAsync(string tenantId, int page, int pageSize, string? status, int? year, int? month);
    Task<InvoiceResponse?> GetInvoiceByIdAsync(int id, string userId);
    Task<InvoiceResponse?> GetInvoiceByIdAsync(int id);
    Task<InvoiceResponse?> GetInvoiceByIdForOwnerAsync(int id, string ownerId, List<string> tenantUserIds); 
    Task<Models.Invoice> CreateInvoiceAsync(Models.Invoice invoice);
    Task<Models.Invoice?> UpdateInvoiceAsync(int id, Models.Invoice invoice, string userId);
    Task<bool> DeleteInvoiceAsync(int id, string userId);
    Task<Models.Invoice?> MarkInvoiceAsPaidAsync(int id, string userId);
    Task<Models.Invoice?> MarkInvoiceAsPaidAsync(int id);
    Task<IEnumerable<InvoiceResponse>> GetInvoicesByStatusAsync(string userId, string status);
    Task<IEnumerable<InvoiceResponse>> GetInvoicesByStatusForOwnerAsync(string ownerId, List<string> tenantUserIds, string status);
   
    //  NEW FUNCTIONS (Ensure DTOs are resolved with selected using)
    Task<UnpaidInvoicesResponseDto> GetUnpaidInvoicesByTenantIdAsync(Guid tenantId);
    Task<TotalPaidLastMonthDto> GetTotalPaidAmountLastMonthAsync(Guid tenantId);
    Task<IEnumerable<PendingInvoiceDto>> GetPendingInvoicesThisMonthAsync(string ownerId);

    Task<List<MonthlyRevenueDataPoint>> GetMonthlyRevenueReportAsync(string ownerId, int lastMonths = 6);
}
