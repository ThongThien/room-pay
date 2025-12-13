namespace InvoiceService.Models;

public class Invoice
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime DueDate { get; set; }
    public string DisplayStatus { get; set; } = "Invisible"; // Hiển thị hoặc không hiển thị
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Unpaid"; // Unpaid, Paid, Cancelled, Overdue
    public DateTime? PaidDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    public int? TenantContractId { get; set; }
    // Navigation property
    public List<InvoiceItem> Items { get; set; } = new();
}