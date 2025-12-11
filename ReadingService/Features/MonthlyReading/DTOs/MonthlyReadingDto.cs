using ReadingService.Models; // Để dùng Enum nếu cần
using System;

namespace ReadingService.Features.MonthlyReading.DTOs
{
    public class MonthlyReadingDto
    {
        public int Id { get; set; }
        public int CycleId { get; set; }
        public int? TenantContractId { get; set; }
        public int? ElectricOld { get; set; }
        public int? WaterOld { get; set; }
        public string Status { get; set; } = string.Empty; 
        public DateTime CreatedAt { get; set; }
    }
}