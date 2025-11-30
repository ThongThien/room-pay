namespace ReadingService.Features.ReadingCycle.DTOs;

public class CreateReadingCycleDto
{
    public string UserId { get; set; } = string.Empty;
    public int CycleMonth { get; set; }
    public int CycleYear { get; set; }
}
