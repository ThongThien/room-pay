using ReadingService.Models.Enums;
using System;
using System.Collections.Generic;

namespace ReadingService.Models;

public class ReadingCycle
{
    public int Id { get; set; }

    public int Month { get; set; }
    public int Year { get; set; }
    public DateTime? Deadline { get; set; }

    public ReadingCycleStatus Status { get; set; } = ReadingCycleStatus.open;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<MonthlyReading> MonthlyReadings { get; set; } = new();
}
