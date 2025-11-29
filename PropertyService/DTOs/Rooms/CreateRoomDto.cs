namespace PropertyService.DTOs.Rooms;
using PropertyService.Models.Enums;

public class CreateRoomDto
{
    public string Name { get; set; } = null!;
    public int Floor { get; set; }
    public RoomStatus Status { get; set; }
}
