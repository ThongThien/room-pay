using System;
using System.Collections.Generic;

namespace PropertyService.Models;

public class House
{
    public int Id { get; set; }
    public int OwnerId { get; set; }    // From User Service
    public string Name { get; set; } = null!;
    public string Address { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Room> Rooms { get; set; } = new();
}
