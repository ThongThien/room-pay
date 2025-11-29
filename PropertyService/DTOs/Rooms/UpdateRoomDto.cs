using PropertyService.Models.Enums;

namespace PropertyService.DTOs.Rooms
{
    public class UpdateRoomDto
    {
        public string Name { get; set; } = null!;
        public int Floor { get; set; }
        public RoomStatus Status { get; set; }
    }
}
