using System.Text.Json.Serialization;
namespace ReadingService.Features.Property.DTOs;

public class CycleUserIdsRequestDto
{
    public int CycleId { get; set; }

    public string UserId { get; set; } = string.Empty;
}