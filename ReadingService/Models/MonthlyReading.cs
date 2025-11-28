using ReadingService.Models.Enums;
using System;

namespace ReadingService.Models;

public class MonthlyReading
{
    public int Id { get; set; }

    public int RoomId { get; set; }     // From PropertyService
    public int CycleId { get; set; }
    public ReadingCycle Cycle { get; set; } = null!;

    public int ElectricOld { get; set; }
    public int ElectricNew { get; set; }
    public string? ElectricImage { get; set; }

    public int WaterOld { get; set; }
    public int WaterNew { get; set; }
    public string? WaterImage { get; set; }

    public MonthlyReadingStatus Status { get; set; } = MonthlyReadingStatus.submitted;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
