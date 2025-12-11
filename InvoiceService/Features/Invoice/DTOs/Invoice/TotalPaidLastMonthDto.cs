// InvoiceService/Features/Invoice/DTOs/Invoice/TotalPaidLastMonthDto.cs

namespace InvoiceService.Features.Invoice.DTOs.Invoice;

public class TotalPaidLastMonthDto
{
    // Tổng số tiền đã thanh toán trong tháng trước
    public decimal TotalAmount { get; set; }
    
    // Chuỗi mô tả tháng (ví dụ: "Tháng 11/2025")
    public string MonthYear { get; set; } = string.Empty;
}