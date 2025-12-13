using NotificationService.Models;

namespace NotificationService.Repositories
{
    public interface INotificationRepository
    {
        // Thêm thông báo mới (sử dụng bởi RabbitMQWorker)
        Task AddAsync(Notification notification);

        // Lấy danh sách thông báo của người dùng (sử dụng bởi API Controller)
        Task<List<Notification>> GetByUserIdAsync(string userId, int limit = 20);

        // Đánh dấu thông báo đã đọc
        Task<bool> MarkAsReadAsync(int notificationId, string userId);
        
        // Đếm số thông báo chưa đọc
        Task<int> CountUnreadAsync(string userId);
    }
}