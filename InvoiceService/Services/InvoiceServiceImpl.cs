using InvoiceService.Data;
using InvoiceService.Models;
using Microsoft.EntityFrameworkCore;

namespace InvoiceService.Services;

public class InvoiceServiceImpl : IInvoiceService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InvoiceServiceImpl> _logger;
    private readonly Features.Pricing.IPricingService _pricingService;

    public InvoiceServiceImpl(
        ApplicationDbContext context, 
        ILogger<InvoiceServiceImpl> logger,
        Features.Pricing.IPricingService pricingService)
    {
        _context = context;
        _logger = logger;
        _pricingService = pricingService;
    }

    public async Task<IEnumerable<Invoice>> GetAllInvoicesByUserAsync(string userId)
    {
        return await _context.Invoices
            .Include(i => i.Items)
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<Invoice?> GetInvoiceByIdAsync(int id, string userId)
    {
        return await _context.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
    }

    public async Task<Invoice> CreateInvoiceAsync(Invoice invoice)
    {
        invoice.CreatedAt = DateTime.UtcNow;
        
        // Calculate total
        invoice.TotalAmount = invoice.Items.Sum(item => item.Amount);
        
        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Created invoice {InvoiceId} for user {UserId}", 
            invoice.Id, invoice.UserId);
        
        return invoice;
    }

    public async Task<Invoice?> UpdateInvoiceAsync(int id, Invoice invoice, string userId)
    {
        var existingInvoice = await _context.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (existingInvoice == null)
            return null;

        existingInvoice.InvoiceDate = invoice.InvoiceDate;
        existingInvoice.DueDate = invoice.DueDate;
        existingInvoice.Status = invoice.Status;
        existingInvoice.UpdatedAt = DateTime.UtcNow;
        
        // Update items
        _context.InvoiceItems.RemoveRange(existingInvoice.Items);
        existingInvoice.Items = invoice.Items;
        
        // Recalculate total
        existingInvoice.TotalAmount = existingInvoice.Items.Sum(item => item.Amount);
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Updated invoice {InvoiceId} for user {UserId}", 
            existingInvoice.Id, userId);
        
        return existingInvoice;
    }

    public async Task<bool> DeleteInvoiceAsync(int id, string userId)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (invoice == null)
            return false;

        _context.Invoices.Remove(invoice);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Deleted invoice {InvoiceId} for user {UserId}", 
            id, userId);
        
        return true;
    }

    public async Task<Invoice?> MarkInvoiceAsPaidAsync(int id, string userId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (invoice == null)
            return null;

        invoice.Status = "Paid";
        invoice.PaidDate = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Marked invoice {InvoiceId} as paid for user {UserId}", 
            id, userId);
        
        return invoice;
    }

    public async Task<IEnumerable<Invoice>> GetInvoicesByStatusAsync(string userId, string status)
    {
        return await _context.Invoices
            .Include(i => i.Items)
            .Where(i => i.UserId == userId && i.Status == status)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }
}
