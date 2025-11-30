namespace InvoiceService.Models;

public class InvoiceItem
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string? ProductCode { get; set; }
    
    // Navigation property
    public Invoice Invoice { get; set; } = null!;
}