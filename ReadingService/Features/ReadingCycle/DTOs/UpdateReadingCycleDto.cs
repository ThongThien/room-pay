namespace ReadingService.Features.ReadingCycle.DTOs;

public class UpdateReadingCycleDto
{
    public string? UserId { get; set; }
    public int? CycleMonth { get; set; }
    public int? CycleYear { get; set; }
}
