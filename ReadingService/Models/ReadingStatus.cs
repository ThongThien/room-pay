namespace ReadingService.Models;

public enum ReadingStatus
{
    Pending,    // Chờ nộp
    Confirmed,  // Đã nộp
    AutoInvoiced // Đã tạo hóa đơn tự động
}
