using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PropertyService.DTOs.Rooms;
using PropertyService.Models;
using PropertyService.Services.Interfaces;
using PropertyService.Repositories;
using PropertyService.Models.Enums;
public class RoomService : IRoomService
{
    private readonly IGenericRepository<Room> _roomRepo;
    private readonly IGenericRepository<House> _houseRepo;
    private readonly IMapper _mapper;

    public RoomService(
        IGenericRepository<Room> roomRepo,
        IGenericRepository<House> houseRepo,
        IMapper mapper)
    {
        _roomRepo = roomRepo;
        _houseRepo = houseRepo;
        _mapper = mapper;
    }

    //  CREATE ROOM
    public async Task<RoomDto> CreateAsync(int houseId, CreateRoomDto dto)
    {
        // Check house tồn tại
        var house = await _houseRepo.GetByIdAsync(houseId);
        if (house == null)
            throw new Exception("House not found");

        var room = new Room
        {
            HouseId = houseId,
            Name = dto.Name,
            Floor = dto.Floor,
            Status = dto.Status
        };

        await _roomRepo.AddAsync(room);

        return _mapper.Map<RoomDto>(room);
    }

    //  GET ALL ROOM BY HOUSE
    public async Task<IEnumerable<RoomDto>> GetAllAsync(int houseId)
    {
        var rooms = await _roomRepo
            .FindAsync(r => r.HouseId == houseId);

        return _mapper.Map<IEnumerable<RoomDto>>(rooms);
    }

    //  GET ROOM BY ID
    public async Task<RoomDto?> GetByIdAsync(int houseId, int roomId)
    {
        var room = await _roomRepo.Query()
            .Include(r => r.House)
            .FirstOrDefaultAsync(r => r.Id == roomId && r.HouseId == houseId);

        if (room == null)
            return null;

        return _mapper.Map<RoomDto>(room);
    }

    //  UPDATE ROOM
    public async Task UpdateAsync(int houseId, int roomId, UpdateRoomDto dto)
    {
        var room = await _roomRepo.Query()
            .FirstOrDefaultAsync(r => r.Id == roomId && r.HouseId == houseId);

        if (room == null)
            throw new Exception("Room not found");

        room.Name = dto.Name;
        room.Floor = dto.Floor;
        room.Status = dto.Status;

        await _roomRepo.UpdateAsync(room);
    }

    //  DELETE ROOM
    public async Task DeleteAsync(int houseId, int roomId)
    {
        var room = await _roomRepo.Query()
            .FirstOrDefaultAsync(r => r.Id == roomId && r.HouseId == houseId);

        if (room == null)
            throw new Exception("Room not found");

        await _roomRepo.DeleteAsync(room);
    }
    public async Task<int?> GetHouseIdByRoomIdAsync(int roomId)
    {
        // Query only gets HouseId of the corresponding Room
        var houseId = await _roomRepo.Query()
            .Where(r => r.Id == roomId)
            .Select(r => (int?)r.HouseId) // Cast to int? to allow null return
            .FirstOrDefaultAsync();

        return houseId;
    }

    public async Task<Room?> GetRoomByIdForContractAsync(int id)
    {
        // Thường chỉ lấy thông tin cần thiết và không include các entities lớn
        var room = await _roomRepo.Query()
            .FirstOrDefaultAsync(r => r.Id == id); 
            
        return room;
    }

    public async Task<bool> UpdateStatusAsync(int id, RoomStatus status)
    {
        var room = await _roomRepo.GetByIdAsync(id);

        if (room == null)
            return false; // hoặc throw exception

        room.Status = status;
        await _roomRepo.UpdateAsync(room);
        return true;
    }
}
