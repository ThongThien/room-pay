// File: PropertyService/DTOs/PropertyDetailsDto.cs

public class PropertyDetailsDto
{
    // ⭐ THAY THẾ CycleId BẰNG ContractId
    public int ContractId { get; set; } 
    
    public string HouseName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public int Floor { get; set; }
}