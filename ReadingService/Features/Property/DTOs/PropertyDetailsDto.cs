namespace ReadingService.Features.Property.DTOs;

public class PropertyDetailsDto
{
    public int CycleId { get; set; } 
    public string TenantId { get; set; } = string.Empty; 
    public string TenantName { get; set; } = string.Empty; 
    public string HouseName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public int Floor { get; set; } 
}