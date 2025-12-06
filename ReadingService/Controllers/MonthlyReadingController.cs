using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ReadingService.Features.MonthlyReading;
using ReadingService.Features.MonthlyReading.DTOs;
using ReadingService.Features.ReadingCycle;
using ReadingService.Data;
using ReadingService.Models;
namespace ReadingService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MonthlyReadingController : ControllerBase
{
    private readonly IMonthlyReadingService _monthlyReadingService;
    private readonly IReadingCycleService _readingCycleService;
    private readonly ILogger<MonthlyReadingController> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    public MonthlyReadingController(
        IMonthlyReadingService monthlyReadingService,
        IReadingCycleService readingCycleService,
        ILogger<MonthlyReadingController> logger,
        ApplicationDbContext context,
        IConfiguration config)
    {
        _monthlyReadingService = monthlyReadingService;
        _readingCycleService = readingCycleService;
        _logger = logger;
        _context = context;
        _config = config;
    }

    /// <summary>
    /// Nộp chỉ số điện nước cho MonthlyReading (submit reading)
    /// </summary>
    [Authorize]
    [HttpPost("{cycleId}/submit")]
    public async Task<ActionResult<MonthlyReadingResponseDto>> SubmitMonthlyReading(
        int cycleId,
        [FromForm] SubmitMonthlyReadingDto dto)
    {
        try
        {
            // Debug log
            _logger.LogInformation($"Controller received - electricNew: {dto.ElectricNew}, waterNew: {dto.WaterNew}");
            
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
    /// Lấy MonthlyReading của user theo CycleId
    /// </summary>
    [Authorize]
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
    [Authorize]
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
    [Authorize(Roles = "Owner")]
    [HttpDelete("{id}")]
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

    // Endpoint: GET api/MonthlyReading (FIXED: Lấy tất cả bản ghi)
    [Authorize]
    [HttpGet] 
    public async Task<ActionResult<IEnumerable<MonthlyReadingResponseDto>>> GetAllMyMonthlyReadings()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
        }

        try
        {
            // ⭐ GỌI HÀM ĐÃ SỬA để lấy TẤT CẢ bản ghi
            var readings = await _monthlyReadingService.GetAllReadingsByUserIdAsync(userId);
            
            return Ok(readings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy MonthlyReadings của user {UserId}", userId);
            return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy readings", error = ex.Message });
        }
    }


    /// <summary>
    /// Proxy S3 image: trả về ảnh từ S3 (dùng cho frontend)
    /// </summary>
    [AllowAnonymous]
    [HttpGet("image-proxy")]
    public async Task<IActionResult> GetS3Image([FromQuery] string key)
    {
        // Đọc config AWS từ appsettings
        var awsSection = _config.GetSection("AWS");
        var awsAccessKey = awsSection["AccessKey"];
        var awsSecretKey = awsSection["SecretKey"];
        var regionStr = awsSection["Region"] ?? "ap-southeast-1";
        var bucketName = awsSection["BucketName"];
        var region = Amazon.RegionEndpoint.GetBySystemName(regionStr);

        try
        {
            using var s3 = new Amazon.S3.AmazonS3Client(awsAccessKey, awsSecretKey, region);
            var request = new Amazon.S3.Model.GetPreSignedUrlRequest
            {
                BucketName = bucketName,
                Key = key,
                Expires = DateTime.UtcNow.AddMinutes(10),
                Verb = Amazon.S3.HttpVerb.GET
            };
            var url = s3.GetPreSignedURL(request);
            return Ok(new { url });
        }
        catch (Amazon.S3.AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return NotFound(new { message = "Không tìm thấy ảnh trên S3", key });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi tạo pre-signed URL ảnh từ S3");
            return StatusCode(500, new { message = "Lỗi tạo pre-signed URL ảnh từ S3", error = ex.Message });
        }
    }
}