using NotificationService.Models.Enums;

namespace NotificationService.DTOs.Invoice
{
    public class InvoiceNotificationMessage
    {
        // Phải được Deserialize dưới dạng Enum
        public NotificationType Type { get; set; } = NotificationType.RemindPayment; 
        
        public List<TenantUnpaidNotification> TenantsToNotify { get; set; } = new List<TenantUnpaidNotification>();
    }
}