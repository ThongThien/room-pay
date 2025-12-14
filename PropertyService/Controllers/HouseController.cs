using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs.Houses;
using System.Net;

namespace PropertyService.Controllers;

[ApiController]
[Route("api/houses")]
[Authorize(Roles = "Owner")] // Chỉ cho phép Owner truy cập
public class HouseController : ControllerBase
{
    private readonly IHouseService _service;

    public HouseController(IHouseService service)
    {
        _service = service;
    }

    // --- HELPER: Lấy Owner ID an toàn ---
    private Guid GetOwnerIdGuid()
    {
        string? ownerIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(ownerIdString))
            throw new UnauthorizedAccessException("Owner ID claim not found in token.");

        if (Guid.TryParse(ownerIdString, out Guid ownerId))
            return ownerId;

        throw new FormatException("The Owner ID retrieved from the token is not a valid GUID.");
    }

    // --- 1. LẤY DANH SÁCH NHÀ ---
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<HouseDto>), (int)HttpStatusCode.OK)]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var ownerId = GetOwnerIdGuid();
            var houses = await _service.GetAllAsync(ownerId);

            return Ok(new
            {
                success = true,
                message = "Lấy danh sách nhà thành công.",
                data = houses
            });
        }
        catch (Exception ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
    }

    // --- 2. TẠO NHÀ MỚI ---
    [HttpPost]
    [ProducesResponseType(typeof(HouseDto), (int)HttpStatusCode.OK)]
    public async Task<IActionResult> Create(CreateHouseDto dto)
    {
        try
        {
            var ownerId = GetOwnerIdGuid();
            var createdHouse = await _service.CreateAsync(dto, ownerId);

            return Ok(new
            {
                success = true,
                message = "Tạo nhà thành công.",
                data = createdHouse
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // --- 3. LẤY CHI TIẾT NHÀ ---
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(HouseDto), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> Get(int id)
    {
        Guid ownerId;

        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch (Exception ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }

        var house = await _service.GetByIdAsync(id);

        if (house == null)
            return NotFound(new { success = false, message = "Không tìm thấy nhà." });

        bool isOwned = await _service.IsOwnedByAsync(id, ownerId);
        if (!isOwned)
        {
            return StatusCode(403, new
            {
                success = false,
                message = "Bạn không có quyền truy cập tài nguyên này."
            });
        }

        return Ok(new
        {
            success = true,
            data = house
        });
    }

    // --- 4. CẬP NHẬT NHÀ ---
    [HttpPut("{id}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> Update(int id, UpdateHouseDto dto)
    {
        Guid ownerId;

        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch
        {
            return Unauthorized(new { success = false, message = "Authentication failed." });
        }

        bool isOwned = await _service.IsOwnedByAsync(id, ownerId);
        if (!isOwned)
        {
            return NotFound(new
            {
                success = false,
                message = "Nhà không tồn tại hoặc bạn không có quyền."
            });
        }

        await _service.UpdateAsync(id, dto);

        return Ok(new
        {
            success = true,
            message = "Cập nhật thành công."
        });
    }

    // --- 5. XÓA NHÀ ---
    [HttpDelete("{id}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [ProducesResponseType((int)HttpStatusCode.Forbidden)]
    public async Task<IActionResult> Delete(int id)
    {
        Guid ownerId;

        try
        {
            ownerId = GetOwnerIdGuid();
        }
        catch
        {
            return Unauthorized(new { success = false, message = "Authentication failed." });
        }

        bool isOwned = await _service.IsOwnedByAsync(id, ownerId);
        if (!isOwned)
        {
            return NotFound(new { success = false, message = "Nhà không tồn tại hoặc bạn không có quyền." });
        }

        await _service.DeleteAsync(id);

        return Ok(new
        {
            success = true,
            message = "Xóa nhà thành công."
        });
    }
}
