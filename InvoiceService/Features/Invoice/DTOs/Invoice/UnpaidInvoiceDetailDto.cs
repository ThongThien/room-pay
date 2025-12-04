// InvoiceService/DTOs/Invoices/UnpaidInvoiceDetailDto.cs
using System;
using InvoiceService.Models.Enums;

namespace InvoiceService.Features.Invoice.DTOs.Invoice
{
    // Trả về chi tiết từng hóa đơn cần thanh toán theo yêu cầu
    public class UnpaidInvoiceDetailDto
    {
        public int InvoiceId { get; set; }
        public string Month { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateOnly DueDate { get; set; }
        public bool IsOverdue { get; set; } // Logic tính toán
        
        // Thêm Status để hiển thị rõ Pending hay Overdue (tùy chọn)
        public InvoiceStatus Status { get; set; } 
    }
}