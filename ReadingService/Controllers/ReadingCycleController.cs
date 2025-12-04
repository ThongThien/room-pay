using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ReadingService.Features.ReadingCycle;
using ReadingService.Features.ReadingCycle.DTOs;
using ReadingService.Features.MonthlyReading; 
using ReadingService.Features.MonthlyReading.DTOs;
namespace ReadingService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReadingCycleController : ControllerBase
{
    private readonly IReadingCycleService _service;
    private readonly IMonthlyReadingService _monthlyReadingService;
    private readonly ILogger<ReadingCycleController> _logger;
    public ReadingCycleController(IReadingCycleService service,
    IMonthlyReadingService monthlyReadingService,
    ILogger<ReadingCycleController> logger)
    {
        _service = service;
        _monthlyReadingService = monthlyReadingService; // ⭐ Gán
        _logger = logger; // ⭐ Gán 
    }

    // ⭐ HÀM MỚI: GetMyMissingReadings
    /// <summary>
    /// Lấy chu kỳ đọc quá khứ mà người dùng đăng nhập chưa nộp hoặc nộp thiếu chỉ số.
    /// </summary>
    /// <returns>MissingReadingsResponseDto</returns>
    // ReadingService/Controllers/ReadingCycleController.cs (Chỉ thay đổi hàm này)
    [HttpGet("me/missing-readings")] 
    public async Task<ActionResult<MissingReadingsResponseDto>> GetMyMissingReadings()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                         ?? User.FindFirstValue("sub") 
                         ?? User.FindFirstValue("userId");
        
        // Chuyển đổi sang Guid để truyền vào Service
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var tenantId))
        {
            return Unauthorized(new { success = false, message = "Không tìm thấy hoặc User ID không hợp lệ." });
        }
        
        try
        {
            // ⭐ GỌI HÀM ĐÃ SỬA (Lọc triệt để theo tenantId trong Service)
            var result = await _monthlyReadingService.GetMissingReadingsAsync(tenantId);
            
            return Ok(new 
            { 
                success = true, 
                message = "Missing readings retrieved successfully.", 
                data = result 
            });
        }
        catch (Exception ex)
        {
             _logger.LogError(ex, "Lỗi khi lấy chỉ số còn thiếu cho user {TenantId}", tenantId); // ⭐ Fixed CS0168
            return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi lấy danh sách chỉ số còn thiếu." });
        }
    }


    // GET: api/ReadingCycle
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReadingCycleDto>>> GetReadingCycles()
    {
        // Lấy userId từ JWT token
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
        }

        // Chỉ lấy cycles của user hiện tại
        var cycles = await _service.GetByUserIdAsync(userId);
        return Ok(cycles);
    }

    // GET: api/ReadingCycle/5
    [HttpGet("{id}")]
    public async Task<ActionResult<ReadingCycleDto>> GetReadingCycle(int id)
    {
        // Lấy userId từ JWT token
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
        }

        var cycle = await _service.GetByIdAsync(id);

        if (cycle == null)
        {
            return NotFound(new { message = "Reading cycle not found" });
        }

        // Kiểm tra xem cycle có thuộc về user này không
        if (cycle.UserId != userId)
        {
            return Forbid(); // 403 Forbidden
        }

        return Ok(cycle);
    }

    // POST: api/ReadingCycle
    [HttpPost]
    [Authorize(Roles = "Owner")] // Bỏ [Authorize] nếu chỉ dùng cho background job
    public async Task<ActionResult<ReadingCycleDto>> CreateReadingCycle(CreateReadingCycleDto createDto)
    {
        // Validate month
        if (createDto.CycleMonth < 1 || createDto.CycleMonth > 12)
        {
            return BadRequest(new { message = "Cycle month must be between 1 and 12" });
        }

        // Check if cycle already exists
        var exists = await _service.ExistsAsync(createDto.UserId, createDto.CycleMonth, createDto.CycleYear);
        if (exists)
        {
            return Conflict(new { message = "Reading cycle already exists for this user, month, and year" });
        }

        var cycle = await _service.CreateAsync(createDto);

        return CreatedAtAction(nameof(GetReadingCycle), new { id = cycle.Id }, cycle);
    }

    // PUT: api/ReadingCycle/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReadingCycle(int id, UpdateReadingCycleDto updateDto)
    {
        // Validate month if provided
        if (updateDto.CycleMonth.HasValue && (updateDto.CycleMonth.Value < 1 || updateDto.CycleMonth.Value > 12))
        {
            return BadRequest(new { message = "Cycle month must be between 1 and 12" });
        }

        var success = await _service.UpdateAsync(id, updateDto);

        if (!success)
        {
            return NotFound(new { message = "Reading cycle not found" });
        }

        return NoContent();
    }

    // DELETE: api/ReadingCycle/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReadingCycle(int id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
        {
            return NotFound(new { message = "Reading cycle not found" });
        }

        return NoContent();
    }
}
