namespace InvoiceService.Features.Invoice.DTOs;

public class UpdateInvoiceRequest
{
    public DateTime InvoiceDate { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<InvoiceItemDto> Items { get; set; } = new();
}
