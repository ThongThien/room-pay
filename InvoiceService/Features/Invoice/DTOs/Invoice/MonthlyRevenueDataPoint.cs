namespace InvoiceService.Features.Invoice.DTOs.Invoice
{
    public class MonthlyRevenueDataPoint
    {
        // Tháng/Năm để hiển thị trên trục X, ví dụ: "10/25"
        public string MonthYear { get; set; } 
        
        // Số tiền đã thanh toán (Group theo PaidDate)
        public decimal PaidAmount { get; set; }
        
        // Số tiền đang chờ thanh toán (Group theo InvoiceDate, chưa quá hạn)
        public decimal PendingAmount { get; set; }
        
        // Số tiền quá hạn thanh toán (Group theo DueDate, trừ tháng hiện tại)
        public decimal OverdueAmount { get; set; }
    }
}