namespace InvoiceService.Features.Invoice.DTOs;

public class InvoiceItemDto
{
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? ProductCode { get; set; }
    
    public decimal Amount => Quantity * UnitPrice;
}
