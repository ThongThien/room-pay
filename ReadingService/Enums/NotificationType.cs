namespace ReadingService.Enums
{
    public enum NotificationType
    {
        NewCycle,           // Khi có reading cycle mới (tự tạo/trigger)
        RemindPayment,      // Dành cho InvoiceService
        RemindSubmission    // Khi owner nhắc nộp chỉ số điện nước 
    }
}