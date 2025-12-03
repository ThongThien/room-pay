using PropertyService.DTOs.Rooms;
using System.Collections.Generic;
using System.Threading.Tasks;
using PropertyService.Models;
using PropertyService.Models.Enums;
namespace PropertyService.Services.Interfaces;

public interface IRoomService
{
    Task<RoomDto> CreateAsync(int houseId, CreateRoomDto dto);
    Task<IEnumerable<RoomDto>> GetAllAsync(int houseId);
    Task<RoomDto?> GetByIdAsync(int houseId, int roomId);
    Task UpdateAsync(int houseId, int roomId, UpdateRoomDto dto);
    Task DeleteAsync(int houseId, int roomId);
    Task<Room?> GetRoomByIdForContractAsync(int id); 
    Task<bool> UpdateStatusAsync(int id, RoomStatus status); 
    Task<int?> GetHouseIdByRoomIdAsync(int roomId);
}
