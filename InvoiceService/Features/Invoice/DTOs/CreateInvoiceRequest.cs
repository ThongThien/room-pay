namespace InvoiceService.Features.Invoice.DTOs;

public class CreateInvoiceRequest
{
    public string UserId { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime DueDate { get; set; }
    public List<InvoiceItemDto> Items { get; set; } = new();
    
    // Optional: For automatic invoice creation from usage
    public int? ElectricUsage { get; set; }
    public int? WaterUsage { get; set; }
    public int? CycleId { get; set; }
    public int? CycleMonth { get; set; }
    public int? CycleYear { get; set; }
}
