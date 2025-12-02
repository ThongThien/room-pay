namespace PaymentService.DTOs;

public class CreatePaymentRequest
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, string>? CustomData { get; set; }
}
