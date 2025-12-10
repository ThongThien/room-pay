using System;

namespace InvoiceService.Features.Invoice.DTOs;

public class PendingInvoiceDto
{
    public int Id { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime InvoiceDate { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
}