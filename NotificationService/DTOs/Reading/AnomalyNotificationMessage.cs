// Trong NotificationService/DTOs/Reading/AnomalyNotificationMessage.cs (Tạo file mới)

namespace NotificationService.DTOs.Reading
{
    // Cấu trúc message gửi từ ReadingService
    public class AnomalyNotificationMessage
    {
        public string Type { get; set; } = string.Empty; // Sẽ là "ReadingAnomaly"
        public string RecipientEmail { get; set; } = string.Empty; // Email của Owner
        public string TenantId { get; set; } = string.Empty;
        // public string FullName {get; set;} = string.Empty;
        public string OwnerId { get; set; } = string.Empty;
        public int CycleMonth { get; set; }
        public int CycleYear { get; set; }
        public int ElectricUsage { get; set; }
        public int WaterUsage { get; set; }
        public bool IsElectricAnomaly { get; set; }
        public bool IsWaterAnomaly { get; set; }
    }
}