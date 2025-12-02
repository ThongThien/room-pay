namespace PaymentService.Services;

public interface IInvoiceServiceClient
{
    Task<bool> MarkInvoiceAsPaidAsync(string invoiceNumber, string transactionId, string paymentMethod);
    Task<InvoiceDto?> GetInvoiceByNumberAsync(string invoiceNumber);
}

public class InvoiceDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
}
