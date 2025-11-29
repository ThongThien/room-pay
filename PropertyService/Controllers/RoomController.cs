using Microsoft.AspNetCore.Mvc;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs.Rooms;

namespace PropertyService.Controllers;

[ApiController]
[Route("api/houses/{houseId}/rooms")]
public class RoomController : ControllerBase
{
    private readonly IRoomService _service;

    public RoomController(IRoomService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create(int houseId, CreateRoomDto dto)
    {
        var room = await _service.CreateAsync(houseId, dto);

        return Ok(new
        {
            success = true,
            message = "Room created successfully",
            data = room
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(int houseId)
    {
        var rooms = await _service.GetAllAsync(houseId);

        return Ok(new
        {
            success = true,
            message = "Rooms retrieved successfully",
            data = rooms
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int houseId, int id)
    {
        var room = await _service.GetByIdAsync(houseId, id);
        if (room == null)
        {
            return NotFound(new
            {
                success = false,
                message = "Room not found"
            });
        }

        return Ok(new
        {
            success = true,
            message = "Room retrieved successfully",
            data = room
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int houseId, int id, UpdateRoomDto dto)
    {
        var roomCheck = await _service.GetByIdAsync(houseId, id);
        if (roomCheck == null)
        {
            return NotFound(new
            {
                success = false,
                message = "Room not found"
            });
        }

        await _service.UpdateAsync(houseId, id, dto);

        return Ok(new
        {
            success = true,
            message = "Room updated successfully"
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int houseId, int id)
    {
        var room = await _service.GetByIdAsync(houseId, id);
        if (room == null)
        {
            return NotFound(new
            {
                success = false,
                message = "Room not found"
            });
        }

        await _service.DeleteAsync(houseId, id);

        return Ok(new
        {
            success = true,
            message = "Room deleted successfully"
        });
    }
}
