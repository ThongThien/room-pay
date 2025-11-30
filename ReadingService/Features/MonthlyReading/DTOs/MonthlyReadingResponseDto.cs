using ReadingService.Models;

namespace ReadingService.Features.MonthlyReading.DTOs;

public class MonthlyReadingResponseDto
{
    public int Id { get; set; }
    public int CycleId { get; set; }
    public int? ElectricOld { get; set; }
    public int? ElectricNew { get; set; }
    public string? ElectricPhotoUrl { get; set; }
    public int? WaterOld { get; set; }
    public int? WaterNew { get; set; }
    public string? WaterPhotoUrl { get; set; }
    public ReadingStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}