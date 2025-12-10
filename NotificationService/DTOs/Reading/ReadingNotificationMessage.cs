using NotificationService.Models.Enums;
using NotificationService.DTOs.User; 

namespace NotificationService.DTOs.Reading
{
    public class ReadingNotificationMessage
    {
        // Phải được Deserialize dưới dạng Enum
        public NotificationType Type { get; set; } 
        
        public int ReadingCycleId { get; set; }
        public string? OwnerName { get; set; }
        
        // Danh sách khách hàng cần thông báo (ví dụ: khi có Cycle mới, gửi cho tất cả)
        // Lưu ý: Dùng List<UserInfo> thay vì List<int> để có sẵn Email và FullName
        public List<UserInfo> CustomersToNotify { get; set; } = new List<UserInfo>(); 
    }
}