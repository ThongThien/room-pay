using NotificationService.Models.Enums;

public class BaseNotificationMessage
{
    // ⭐️ Khớp với tên thuộc tính 'Type' trong mọi Payload của Producer
    public NotificationType Type { get; set; }
}