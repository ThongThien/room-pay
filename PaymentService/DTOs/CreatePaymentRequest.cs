namespace PaymentService.DTOs;

public class CreatePaymentRequest
{
    /// <summary>
    /// Invoice ID (số nguyên, ví dụ: 42)
    /// </summary>
    public int? InvoiceId { get; set; }
    
    /// <summary>
    /// Invoice Number (chuỗi, ví dụ: "INV-001") - Deprecated, dùng InvoiceId thay thế
    /// </summary>
    public string? InvoiceNumber { get; set; }
    
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, string>? CustomData { get; set; }
}
