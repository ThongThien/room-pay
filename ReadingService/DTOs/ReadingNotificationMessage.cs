using ReadingService.Enums;
using ReadingService.Features.User.DTOs;

namespace ReadingService.DTOs
{
    public class ReadingNotificationMessage
    {
        public NotificationType Type { get; set; } 
        
        public int ReadingCycleId { get; set; }
        public string OwnerName { get; set; } = "The Owner";
        public int CycleMonth { get; set; }
        public int CycleYear { get; set; }
        
        // Danh sách khách hàng (UserInfo) cần thông báo
        public List<UserInfo> CustomersToNotify { get; set; } = new List<UserInfo>();  
    }
}