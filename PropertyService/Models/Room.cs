using PropertyService.Models.Enums;
using System;

namespace PropertyService.Models;

public class Room
{
    public int Id { get; set; }
    public int HouseId { get; set; }
    public House House { get; set; } = null!;

    public string Name { get; set; } = null!;
    public int Floor { get; set; }
    public RoomStatus Status { get; set; } = RoomStatus.vacant;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
