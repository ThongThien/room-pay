// InvoiceService/Features/Invoice/InvoiceServiceImpl.cs

using InvoiceService.Data;
using InvoiceService.Models;
using Microsoft.EntityFrameworkCore;
using InvoiceService.Features.Invoice.DTOs.Invoice;
using InvoiceService.Models.Enums;
using InvoiceService.Repositories.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection; // Cần cho [ActivatorUtilitiesConstructor]
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace InvoiceService.Features.Invoice;

public class InvoiceServiceImpl : IInvoiceService
{
    // ⭐ Đã thay thế ApplicationDbContext bằng IInvoiceRepository
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly ILogger<InvoiceServiceImpl> _logger;
    private readonly Pricing.IPricingService _pricingService;
    // private readonly ApplicationDbContext _context;
    
    // [ActivatorUtilitiesConstructor] chỉ cần thiết nếu có nhiều constructors,
    // nhưng ta giữ nó để đảm bảo DI Container dùng Constructor này.
    [ActivatorUtilitiesConstructor]
    public InvoiceServiceImpl(
        IInvoiceRepository invoiceRepo, 
        ILogger<InvoiceServiceImpl> logger,
        Pricing.IPricingService pricingService
    )
    {
        _invoiceRepo = invoiceRepo;
        _logger = logger;
        _pricingService = pricingService;
    }

    // --- CÁC HÀM CRUD CŨ (ĐÃ SỬA DỤNG REPOSITORY) ---

    public async Task<IEnumerable<Models.Invoice>> GetAllInvoicesByUserAsync(string userId)
    {
        // ⭐ Thay thế _context.Invoices bằng _invoiceRepo.Query()
        return await _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Models.Invoice>> GetAllInvoicesByOwnerAsync(string ownerId, List<string> tenantUserIds)
    {
        return await _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => tenantUserIds.Contains(i.UserId))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<Models.Invoice?> GetInvoiceByIdAsync(int id, string userId)
    {
        // ⭐ Thay thế
        return await _invoiceRepo.Query()
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
    }

    public async Task<Models.Invoice?> GetInvoiceByIdAsync(int id)
    {
        // ⭐ Thay thế (Service-to-service call)
        return await _invoiceRepo.Query()
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task<Models.Invoice> CreateInvoiceAsync(Models.Invoice invoice)
    {
        invoice.CreatedAt = DateTime.UtcNow;
        invoice.TotalAmount = invoice.Items.Sum(item => item.Amount);
        
        // ⭐ Sử dụng Repository để thêm và lưu
        await _invoiceRepo.AddAsync(invoice);
        
        _logger.LogInformation("Created invoice {InvoiceId} for user {UserId}", 
            invoice.Id, invoice.UserId);
        
        return invoice;
    }

    public async Task<Models.Invoice?> UpdateInvoiceAsync(int id, Models.Invoice invoice, string userId)
    {
        var existingInvoice = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (existingInvoice == null)
            return null;

        existingInvoice.InvoiceDate = invoice.InvoiceDate;
        existingInvoice.DueDate = invoice.DueDate;
        existingInvoice.Status = invoice.Status;
        existingInvoice.UpdatedAt = DateTime.UtcNow;
        
        // Cần phương thức để xóa/cập nhật Items (Giả sử bạn có hàm Update trong Repo)
        // Lưu ý: Nếu Repo không có sẵn logic xóa items, cần dùng DbContext hoặc sửa Repo
        // ⭐ Giả định Repository có thể xử lý việc cập nhật
        existingInvoice.Items.Clear(); // Xóa cũ
        foreach (var item in invoice.Items)
        {
            existingInvoice.Items.Add(item); // Thêm mới
        }

        existingInvoice.TotalAmount = existingInvoice.Items.Sum(item => item.Amount);
        
        await _invoiceRepo.UpdateAsync(existingInvoice);
        
        _logger.LogInformation("Updated invoice {InvoiceId} for user {UserId}", 
            existingInvoice.Id, userId);
        
        return existingInvoice;
    }

    public async Task<bool> DeleteInvoiceAsync(int id, string userId)
    {
        var invoice = await _invoiceRepo.Query()
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (invoice == null)
            return false;

        // ⭐ Sử dụng Repository để xóa
        await _invoiceRepo.DeleteAsync(invoice);
        
        _logger.LogInformation("Deleted invoice {InvoiceId} for user {UserId}", 
            id, userId);
        
        return true;
    }

    public async Task<Models.Invoice?> MarkInvoiceAsPaidAsync(int id, string userId)
    {
        var invoice = await _invoiceRepo.Query()
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (invoice == null) return null;

        invoice.Status = "Paid";
        invoice.PaidDate = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;
        
        await _invoiceRepo.UpdateAsync(invoice);
        
        _logger.LogInformation("Marked invoice {InvoiceId} as paid for user {UserId}", id, userId);
        
        return invoice;
    }

    public async Task<Models.Invoice?> MarkInvoiceAsPaidAsync(int id)
    {
        var invoice = await _invoiceRepo.Query()
            .FirstOrDefaultAsync(i => i.Id == id);
        
        if (invoice == null) return null;

        invoice.Status = "Paid";
        invoice.PaidDate = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;
        
        await _invoiceRepo.UpdateAsync(invoice);
        
        _logger.LogInformation("Marked invoice {InvoiceId} as paid (service-to-service)", id);
        
        return invoice;
    }

    public async Task<IEnumerable<Models.Invoice>> GetInvoicesByStatusAsync(string userId, string status)
    {
        return await _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => i.UserId == userId && i.Status == status)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Models.Invoice>> GetInvoicesByStatusForOwnerAsync(string ownerId, List<string> tenantUserIds, string status)
    {
        return await _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => tenantUserIds.Contains(i.UserId) && i.Status == status)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }
    // InvoiceService/Features/Invoice/InvoiceServiceImpl.cs
    public async Task<UnpaidInvoicesResponseDto> GetUnpaidInvoicesByTenantIdAsync(Guid tenantId)
    {
        try
        {
            string tenantIdString = tenantId.ToString();
            DateOnly today = DateOnly.FromDateTime(DateTime.Today); 
            
            // ⭐ SỬA LỌC TRẠNG THÁI: Chỉ tìm kiếm UNPAID (theo Enum mới)
            string unpaidStatus = InvoiceStatus.Unpaid.ToString(); 

            // 1. Định nghĩa truy vấn cơ sở
            var unpaidInvoicesQuery = _invoiceRepo.Query()
                .Where(i => i.UserId == tenantIdString) 
                // Chỉ lọc theo trạng thái Unpaid (như trong DB)
                .Where(i => i.Status == unpaidStatus); 

            // 2. Tính tổng số tiền chưa thanh toán (Server-side)
            decimal totalAmount = await unpaidInvoicesQuery.SumAsync(i => i.TotalAmount);
            
            // 3. Lấy chi tiết và ánh xạ (Client-side để tránh lỗi EF Core)
            var unpaidInvoices = unpaidInvoicesQuery
                .OrderBy(i => i.DueDate)
                .AsEnumerable() // BẮT BUỘC: Ép EF Core tải dữ liệu trước khi dùng Enum.Parse và DateOnly.FromDateTime
                .Select(i => new UnpaidInvoiceDetailDto
                {
                    InvoiceId = i.Id,
                    
                    // Chuyển đổi an toàn trên Client-side
                    Month = $"Tháng {DateOnly.FromDateTime(i.InvoiceDate).Month}/{DateOnly.FromDateTime(i.InvoiceDate).Year}", 
                    
                    Amount = i.TotalAmount,
                    
                    DueDate = DateOnly.FromDateTime(i.DueDate), 
                    
                    // ⭐ LOGIC OVERDUE: Tính toán dựa trên DueDate và ngày hiện tại
                    IsOverdue = DateOnly.FromDateTime(i.DueDate) < today, 
                    
                    // Trạng thái luôn là Unpaid khi truy vấn
                    Status = (InvoiceStatus)Enum.Parse(typeof(InvoiceStatus), i.Status, true) 
                })
                .ToList(); // Dùng ToList() vì AsEnumerable() đã tải dữ liệu vào bộ nhớ

            return new UnpaidInvoicesResponseDto
            {
                TotalUnpaidAmount = totalAmount,
                UnpaidInvoices = unpaidInvoices
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xử lý dữ liệu hóa đơn chưa thanh toán cho Tenant {TenantId}. Chi tiết: {Message}", tenantId, ex.Message);
            throw; 
        }
    }
    public Task<TotalPaidLastMonthDto> GetTotalPaidAmountLastMonthAsync(Guid tenantId)
    {
        return Task.FromResult(new TotalPaidLastMonthDto 
        { 
            TotalAmount = 0m, 
            MonthYear = "N/A" 
        });
    }
}
