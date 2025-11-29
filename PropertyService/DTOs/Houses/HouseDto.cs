using System;

namespace PropertyService.DTOs.Houses;

public class HouseDto
{
    public int Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = null!;
    public string Address { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
