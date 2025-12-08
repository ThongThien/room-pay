namespace ReadingService.Features.Property.DTOs;

public class PropertyDetailsDto
{
    public int? ContractId { get; set; } 
    public string HouseName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public int Floor { get; set; }
}