using System;
using PropertyService.Models.Enums;

namespace PropertyService.DTOs.Rooms;

public class RoomDto
{
    public int Id { get; set; }
    public int HouseId { get; set; }
    public string Name { get; set; } = null!;
    public int Floor { get; set; }
    public RoomStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}
