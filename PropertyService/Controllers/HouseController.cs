using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs.Houses;

namespace PropertyService.Controllers;

[ApiController]
[Route("api/houses")]
[Authorize(Roles = "Owner")] // Chỉ cho phép tài khoản Role Owner truy cập
public class HouseController : ControllerBase
{
    private readonly IHouseService _houseService;

    public HouseController(IHouseService houseService)
    {
        _houseService = houseService;
    }

    // --- Helper: Lấy OwnerId từ Token ---
    private Guid GetCurrentOwnerId()
    {
        var ownerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

        if (ownerIdClaim == null || string.IsNullOrEmpty(ownerIdClaim.Value))
        {
            throw new UnauthorizedAccessException("Không tìm thấy thông tin định danh trong Token.");
        }

        if (Guid.TryParse(ownerIdClaim.Value, out Guid ownerId))
        {
            return ownerId;
        }

        throw new UnauthorizedAccessException("Token không hợp lệ (ID không đúng định dạng).");
    }

    // --- 1. LẤY DANH SÁCH NHÀ ---
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var ownerId = GetCurrentOwnerId();
            var houses = await _houseService.GetAllAsync(ownerId);

            return Ok(new
            {
                success = true,
                message = "Lấy danh sách nhà thành công.",
                data = houses
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Lỗi Server: " + ex.Message });
        }
    }

    // --- 2. TẠO NHÀ MỚI ---
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHouseDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Dữ liệu gửi lên không hợp lệ.", errors = ModelState });
        }

        try
        {
            var ownerId = GetCurrentOwnerId();
            var createdHouse = await _houseService.CreateAsync(dto, ownerId);

            return StatusCode(201, new
            {
                success = true,
                message = "Tạo nhà trọ mới thành công.",
                data = createdHouse
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // --- 3. LẤY CHI TIẾT 1 NHÀ ---
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        try
        {
            var ownerId = GetCurrentOwnerId();
            var isOwned = await _houseService.IsOwnedByAsync(id, ownerId);

            if (!isOwned)
            {
                return StatusCode(403, new { success = false, message = "Bạn không có quyền truy cập hoặc nhà không tồn tại." });
            }

            var house = await _houseService.GetByIdAsync(id);
            if (house == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy nhà trọ." });
            }

            return Ok(new
            {
                success = true,
                data = house
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // --- 4. CẬP NHẬT NHÀ ---
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateHouseDto dto)
    {
        try
        {
            var ownerId = GetCurrentOwnerId();
            var isOwned = await _houseService.IsOwnedByAsync(id, ownerId);

            if (!isOwned)
            {
                return StatusCode(403, new { success = false, message = "Bạn không có quyền sửa nhà này." });
            }

            await _houseService.UpdateAsync(id, dto);

            return Ok(new
            {
                success = true,
                message = "Cập nhật thông tin nhà thành công."
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = "Không thể cập nhật: " + ex.Message });
        }
    }

    // --- 5. XÓA NHÀ ---
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var ownerId = GetCurrentOwnerId();
            var isOwned = await _houseService.IsOwnedByAsync(id, ownerId);

            if (!isOwned)
            {
                return StatusCode(403, new { success = false, message = "Bạn không có quyền xóa nhà này." });
            }

            await _houseService.DeleteAsync(id);

            return Ok(new
            {
                success = true,
                message = "Đã xóa nhà trọ thành công."
            });
        }
        catch (Exception)
        {
            return BadRequest(new { success = false, message = "Không thể xóa: Nhà đang chứa phòng hoặc dữ liệu liên quan." });
        }
    }
}
