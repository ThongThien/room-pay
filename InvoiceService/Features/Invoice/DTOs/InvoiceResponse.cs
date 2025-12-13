namespace InvoiceService.Features.Invoice.DTOs;

public class InvoiceResponse
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime DueDate { get; set; }
    public string DisplayStatus { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? PaidDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int? TenantContractId { get; set; }
    public string? HouseName { get; set; } = string.Empty;
    public string? RoomName { get; set; } = string.Empty;
    public int? Floor { get; set; }
    public List<InvoiceItemResponse> Items { get; set; } = new List<InvoiceItemResponse>();
    
}

public class InvoiceItemResponse
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string? ProductCode { get; set; }
}
