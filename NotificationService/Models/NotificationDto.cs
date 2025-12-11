using NotificationService.Models.Enums; 
namespace NotificationService.Models
{
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Message { get; set; } = string.Empty;
        public NotificationType Type { get; set; } 
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}