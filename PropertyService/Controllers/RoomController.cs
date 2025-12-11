// PropertyService/Controllers/RoomController.cs (CẬP NHẬT)
using Microsoft.AspNetCore.Mvc;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs.Rooms;
using Microsoft.AspNetCore.Authorization; // Cần thiết
using System.Security.Claims; // Cần thiết
using System.Net; // Cần thiết

namespace PropertyService.Controllers;

[ApiController]
[Route("api/houses/{houseId}/rooms")]
[Authorize(Roles = "Owner")] // CHỈ OWNER MỚI ĐƯỢC QUẢN LÝ PHÒNG
public class RoomController : ControllerBase
{
    private readonly IRoomService _roomService;
    private readonly IHouseService _houseService; // CẦN INJECT HOUSE SERVICE ĐỂ CHECK QUYỀN SỞ HỮU

    public RoomController(IRoomService roomService, IHouseService houseService)
    {
        _roomService = roomService;
        _houseService = houseService;
    }

    // --- HELPER: Lấy Owner ID an toàn (Sử dụng lại logic HouseController) ---
    private Guid GetOwnerIdGuid()
    {
        // Sử dụng logic TryParse an toàn đã fix
        string? ownerIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(ownerIdString) || !Guid.TryParse(ownerIdString, out Guid ownerId))
        {
            throw new UnauthorizedAccessException("Invalid or missing Owner ID in token.");
        }
        return ownerId;
    }

    // --- CHECK: Đảm bảo House thuộc về Owner hiện tại ---
    private async Task<IActionResult?> CheckHouseOwnership(int houseId, Guid ownerId)
    {
        bool isOwned = await _houseService.IsOwnedByAsync(houseId, ownerId);
        if (!isOwned)
        {
            return StatusCode(403, 
                new { success = false, message = "Access denied. House is not owned by the current user." });
        }
        return null; // Nếu kiểm tra thành công
    }

    [HttpPost]
    [ProducesResponseType(typeof(RoomDto), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<IActionResult> Create(int houseId, CreateRoomDto dto)
    {
        Guid ownerId;
        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch (Exception)
        {
            return Unauthorized();
        }

        // KIỂM TRA 1: Owner có sở hữu House này không?
        var ownershipError = await CheckHouseOwnership(houseId, ownerId);
        if (ownershipError != null) return ownershipError;

        var room = await _roomService.CreateAsync(houseId, dto);

        return Ok(new
        {
            success = true,
            message = "Room created successfully",
            data = room
        });
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<RoomDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> GetAll(int houseId)
    {
        Guid ownerId;
        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch (Exception)
        {
            return Unauthorized();
        }

        // KIỂM TRA 1: Owner có sở hữu House này không?
        var ownershipError = await CheckHouseOwnership(houseId, ownerId);
        if (ownershipError != null) return ownershipError;

        var rooms = await _roomService.GetAllAsync(houseId);

        return Ok(new
        {
            success = true,
            message = "Rooms retrieved successfully",
            data = rooms
        });
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(RoomDto), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> Get(int houseId, int id)
    {
        Guid ownerId;
        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch (Exception)
        {
            return Unauthorized();
        }
        
        // KIỂM TRA 1: Owner có sở hữu House này không?
        var ownershipError = await CheckHouseOwnership(houseId, ownerId);
        if (ownershipError != null) return ownershipError;

        var room = await _roomService.GetByIdAsync(houseId, id);
        if (room == null)
        {
            // Dù kiểm tra House thành công, Room vẫn có thể không tồn tại
            return NotFound(new { success = false, message = "Room not found in the specified house" });
        }

        return Ok(new { success = true, message = "Room retrieved successfully", data = room });
    }

    // Các phương thức Update và Delete cũng sẽ cần thêm CheckHouseOwnership tương tự
    // ... (Thêm kiểm tra quyền sở hữu vào Update và Delete)

    [HttpPut("{id}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> Update(int houseId, int id, UpdateRoomDto dto)
    {
        Guid ownerId;
        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch (Exception)
        {
            return Unauthorized();
        }
        
        var ownershipError = await CheckHouseOwnership(houseId, ownerId);
        if (ownershipError != null) return ownershipError;

        // This line (GetByIdAsync) will throw exception if Room doesn't exist in that House
        // However, checking in Controller provides a more user-friendly 404 response
        var roomCheck = await _roomService.GetByIdAsync(houseId, id); 
        if (roomCheck == null)
        {
             return NotFound(new { success = false, message = "Room not found in the specified house" });
        }

        // Nếu room tồn tại và House thuộc Owner, tiến hành Update
        await _roomService.UpdateAsync(houseId, id, dto);

        return Ok(new { success = true, message = "Room updated successfully" });
    }

    [HttpDelete("{id}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> Delete(int houseId, int id)
    {
        Guid ownerId;
        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch (Exception)
        {
            return Unauthorized();
        }
        
        var ownershipError = await CheckHouseOwnership(houseId, ownerId);
        if (ownershipError != null) return ownershipError;

        var room = await _roomService.GetByIdAsync(houseId, id);
        if (room == null)
        {
            return NotFound(new { success = false, message = "Room not found in the specified house" });
        }

        await _roomService.DeleteAsync(houseId, id);

        return Ok(new { success = true, message = "Room deleted successfully" });
    }
}