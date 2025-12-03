using Microsoft.AspNetCore.Mvc;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs.Houses;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization; // Thêm
using System.Net; // Thêm

namespace PropertyService.Controllers;

[ApiController]
[Route("api/houses")]
[Authorize(Roles = "Owner")] // Chỉ cho phép Owner truy cập các endpoint này
public class HouseController : ControllerBase
{
    private readonly IHouseService _service;

    public HouseController(IHouseService service)
    {
        _service = service;
    }

    // --- HELPER: Lấy Owner ID an toàn (Sửa lỗi Guid.Parse) ---
    private Guid GetOwnerIdGuid()
    {
        string? ownerIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // Trả về Unauthorized nếu không tìm thấy ID (Mặc dù [Authorize] đã chặn, nhưng là lớp bảo vệ cuối cùng)
        if (string.IsNullOrEmpty(ownerIdString))
        {
            throw new UnauthorizedAccessException("Owner ID claim not found in token.");
        }
        
        // Sử dụng TryParse để ngăn lỗi Format/Null
        if (Guid.TryParse(ownerIdString, out Guid ownerId))
        {
            return ownerId;
        }

        throw new FormatException("The Owner ID retrieved from the token is not a valid GUID.");
    }

    [HttpPost]
    [ProducesResponseType(typeof(HouseDto), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
    public async Task<IActionResult> Create(CreateHouseDto dto)
    {
        // 1. Lấy Owner ID an toàn
        Guid ownerId;
        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException || ex is FormatException)
        {
            return Unauthorized(new { success = false, message = "Authentication failed: " + ex.Message });
        }

        // 2. Tạo House
        var createdHouse = await _service.CreateAsync(dto, ownerId);

        return Ok(new
        {
            success = true,
            message = "House created successfully",
            data = createdHouse
        });
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<HouseDto>), (int)HttpStatusCode.OK)]
    public async Task<IActionResult> GetAll()
    {
        // Lấy Owner ID an toàn
        Guid ownerId;
        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException || ex is FormatException)
        {
            return Unauthorized(new { success = false, message = "Authentication failed: " + ex.Message });
        }
        
        // HouseService phải có logic lọc theo ownerId này
        var houses = await _service.GetAllAsync(ownerId);

        return Ok(new
        {
            success = true,
            message = "Houses retrieved successfully",
            data = houses
        });
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(HouseDto), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)] // Thêm Forbidden
    public async Task<IActionResult> Get(int id)
    {
        Guid currentOwnerId;
        try
        {
            currentOwnerId = GetOwnerIdGuid();
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException || ex is FormatException)
        {
            return Unauthorized(new { success = false, message = "Authentication failed: " + ex.Message });
        }
        
        var house = await _service.GetByIdAsync(id);
        
        if (house == null)
        {
            return NotFound(new { success = false, message = "House not found" });
        }
        
        // KIỂM TRA QUYỀN SỞ HỮU TRÊN SERVICE LAYER
        // Giả sử IHouseService.IsOwnedByAsync tồn tại
        bool isOwned = await _service.IsOwnedByAsync(id, currentOwnerId);
        
        if (!isOwned)
        {
            // Sửa lỗi CS1503: Thay thế Forbid(object) bằng StatusCode(403, object)
            return StatusCode(403, new 
            { 
                success = false, 
                message = "You do not have permission to access this resource." 
            });
        }
        return Ok(new
        {
            success = true,
            message = "House retrieved successfully",
            data = house
        });
    }

    [HttpPut("{id}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> Update(int id, UpdateHouseDto dto)
    {
        Guid currentOwnerId;
        try
        {
            currentOwnerId = GetOwnerIdGuid();
        }
        catch (Exception)
        {
            return Unauthorized(new { success = false, message = "Authentication failed." });
        }
        
        // KIỂM TRA TỒN TẠI VÀ QUYỀN SỞ HỮU TRÊN SERVICE LAYER
        bool isOwned = await _service.IsOwnedByAsync(id, currentOwnerId);

        if (!isOwned)
        {
             // Tránh tiết lộ thông tin (nếu House không tồn tại hoặc không thuộc quyền)
             return NotFound(new { success = false, message = "House not found or you lack permission." });
        }
        
        await _service.UpdateAsync(id, dto);

        return Ok(new
        {
            success = true,
            message = "House updated successfully"
        });
    }

    [HttpDelete("{id}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> Delete(int id)
    {
        Guid currentOwnerId;
        try
        {
            currentOwnerId = GetOwnerIdGuid();
        }
        catch (Exception)
        {
            return Unauthorized(new { success = false, message = "Authentication failed." });
        }
        
        // KIỂM TRA TỒN TẠI VÀ QUYỀN SỞ HỮU TRÊN SERVICE LAYER
        bool isOwned = await _service.IsOwnedByAsync(id, currentOwnerId);
        
        if (!isOwned)
        {
             return NotFound(new { success = false, message = "House not found or you lack permission." });
        }

        await _service.DeleteAsync(id);

        return Ok(new
        {
            success = true,
            message = "House deleted successfully"
        });
    }
}