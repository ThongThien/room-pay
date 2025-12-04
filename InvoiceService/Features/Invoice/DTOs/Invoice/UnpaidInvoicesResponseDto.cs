// InvoiceService/DTOs/Invoices/UnpaidInvoicesResponseDto.cs
using System.Collections.Generic;
using InvoiceService.Models.Enums;
namespace InvoiceService.Features.Invoice.DTOs.Invoice
{
    // Trả về danh sách và tổng số tiền chưa thanh toán
    public class UnpaidInvoicesResponseDto
    {
        public decimal TotalUnpaidAmount { get; set; }
        public List<UnpaidInvoiceDetailDto> UnpaidInvoices { get; set; } = new List<UnpaidInvoiceDetailDto>();
    }
}