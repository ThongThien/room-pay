using InvoiceService.Models.Enums;
using System;
using System.Collections.Generic;

namespace InvoiceService.Models;

public class Invoice
{
    public int Id { get; set; }

    public int RoomId { get; set; }
    public int ContractId { get; set; }
    public int? ReadingId { get; set; }

    public int Month { get; set; }
    public int Year { get; set; }

    public decimal Total { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.unpaid;

    public string? InvoiceUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public List<InvoiceItem> Items { get; set; } = new();
}
