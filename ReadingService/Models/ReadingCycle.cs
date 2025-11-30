namespace ReadingService.Models;

public class ReadingCycle
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int CycleMonth { get; set; }
    public int CycleYear { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation property
    public MonthlyReading? MonthlyReading { get; set; }
}