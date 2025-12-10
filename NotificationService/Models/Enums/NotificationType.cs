namespace NotificationService.Models.Enums
{
    // Sử dụng string enum để dễ dàng Serialize/Deserialize và lưu vào DB
    // Bạn có thể cài đặt NuGet package "System.Text.Json.Serialization" 
    // hoặc sử dụng thư viện Newtonsoft.Json cho String Enum Converter nếu cần.
    
    public enum NotificationType
    {
        // 1. Thông báo khi có Reading Cycle mới (InvoiceService/ReadingService -> Toàn bộ khách)
        NewCycle,

        // 2. Nhắc thanh toán (InvoiceService -> Khách có hóa đơn chưa thanh toán)
        RemindPayment,

        // 3. Nhắc nộp chỉ số điện nước (ReadingService -> Khách có monthlyReading mới nhất chưa có điện nước)
        RemindSubmission 
    }
}