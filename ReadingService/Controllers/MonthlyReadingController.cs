using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ReadingService.Features.MonthlyReading;
using ReadingService.Features.MonthlyReading.DTOs;
using ReadingService.Features.ReadingCycle;

namespace ReadingService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MonthlyReadingsController : ControllerBase
{
    private readonly IMonthlyReadingService _monthlyReadingService;
    private readonly IReadingCycleService _readingCycleService;
    private readonly ILogger<MonthlyReadingsController> _logger;

    public MonthlyReadingsController(
        IMonthlyReadingService monthlyReadingService,
        IReadingCycleService readingCycleService,
        ILogger<MonthlyReadingsController> logger)
    {
        _monthlyReadingService = monthlyReadingService;
        _readingCycleService = readingCycleService;
        _logger = logger;
    }

    /// <summary>
    /// Nộp chỉ số điện nước cho MonthlyReading (submit reading)
    /// </summary>
    [HttpPost("{cycleId}/submit")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<MonthlyReadingResponseDto>> SubmitMonthlyReading(
        int cycleId,
        [FromForm] SubmitMonthlyReadingDto dto)
    {
        try
        {
            // Debug - đọc trực tiếp từ Request.Form
            var form = Request.Form;
            _logger.LogInformation($"Form keys: {string.Join(", ", form.Keys)}");
            foreach (var key in form.Keys)
            {
                _logger.LogInformation($"Form[{key}] = {form[key]}");
            }
            
            // Debug log
            _logger.LogInformation($"Controller received - electricOld: {dto.ElectricOld}, electricNew: {dto.ElectricNew}, waterOld: {dto.WaterOld}, waterNew: {dto.WaterNew}");
            
            // Lấy userId từ JWT token
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("sub") 
                         ?? User.FindFirstValue("userId");
            
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
            }

            // Kiểm tra xem cycle có thuộc về user này không
            var isOwner = await _readingCycleService.IsOwnerAsync(cycleId, userId);
            if (!isOwner)
            {
                return Forbid(); // 403 Forbidden
            }

            var response = await _monthlyReadingService.SubmitAsync(cycleId, dto);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi nộp MonthlyReading");
            return StatusCode(500, new { message = "Có lỗi xảy ra khi nộp reading", error = ex.Message });
        }
    }

    /// <summary>
    /// Lấy tất cả MonthlyReadings của user hiện tại
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MonthlyReadingResponseDto>>> GetAllMyMonthlyReadings()
    {
        // Lấy userId từ JWT token
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
        }

        // Lấy tất cả cycles của user
        var cycles = await _readingCycleService.GetByUserIdAsync(userId);
        var cycleIds = cycles.Select(c => c.Id).ToList();

        var readings = new List<MonthlyReadingResponseDto>();
        foreach (var cycleId in cycleIds)
        {
            var reading = await _monthlyReadingService.GetByCycleIdAsync(cycleId);
            if (reading != null)
            {
                readings.Add(reading);
            }
        }

        return Ok(readings);
    }

    /// <summary>
    /// Lấy MonthlyReading của user theo CycleId
    /// </summary>
    [HttpGet("by-cycle/{cycleId}")]
    public async Task<ActionResult<MonthlyReadingResponseDto>> GetMyMonthlyReadingByCycle(int cycleId)
    {
        // Lấy userId từ JWT token
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
        }

        // Kiểm tra xem cycle có thuộc về user này không
        var isOwner = await _readingCycleService.IsOwnerAsync(cycleId, userId);
        if (!isOwner)
        {
            return Forbid(); // 403 Forbidden
        }

        var response = await _monthlyReadingService.GetByCycleIdAsync(cycleId);
        
        if (response == null)
        {
            return NotFound(new { message = "Không tìm thấy reading cho cycle này" });
        }

        return Ok(response);
    }

    /// <summary>
    /// Lấy thông tin MonthlyReading theo ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<MonthlyReadingResponseDto>> GetMonthlyReading(int id)
    {
        var response = await _monthlyReadingService.GetByIdAsync(id);
        
        if (response == null)
        {
            return NotFound(new { message = "Không tìm thấy reading" });
        }

        return Ok(response);
    }

    /// <summary>
    /// Xóa MonthlyReading
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult> DeleteMonthlyReading(int id)
    {
        try
        {
            var result = await _monthlyReadingService.DeleteAsync(id);
            if (!result)
            {
                return NotFound(new { message = "Không tìm thấy reading" });
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa MonthlyReading");
            return StatusCode(500, new { message = "Có lỗi xảy ra khi xóa reading", error = ex.Message });
        }
    }
}