using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ReadingService.Features.MonthlyReading;
using ReadingService.Features.MonthlyReading.DTOs;
using ReadingService.Features.ReadingCycle;
using ReadingService.Data;
using ReadingService.Models;
using System.Net;
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

    /// <summary>
    /// Lấy TẤT CẢ MonthlyReadings của user (Tenant: lấy của mình; Owner: lấy của tất cả Tenant được quản lý)
    /// Endpoint: GET api/MonthlyReading
    /// </summary>
    [Authorize]
    [HttpGet] 
    public async Task<ActionResult<IEnumerable<MonthlyReadingResponseDto>>> GetAllMyMonthlyReadings()
    {
        // 1. TRÍCH XUẤT CLAIMS TỪ JWT TOKEN
        
        // Lấy User ID (sẽ là Tenant ID hoặc Owner ID tùy vai trò)
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                    ?? User.FindFirstValue("sub") 
                    ?? User.FindFirstValue("userId");
        
        // Lấy Role (Quan trọng nhất cho Service để biết cách lọc)
        var role = User.FindFirstValue(ClaimTypes.Role);
        
        // Lấy OwnerId (Claim này có thể có nếu Role là Tenant, nhưng không bắt buộc cho logic Owner)
        var ownerIdClaim = User.FindFirstValue("ownerId"); 
        
        // 2. KIỂM TRA TÍNH HỢP LỆ
        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(role))
        {
            // Ghi log lỗi nếu không tìm thấy thông tin cần thiết
            _logger.LogWarning("Truy cập không hợp lệ: Không tìm thấy UserId hoặc Role.");
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng hoặc vai trò trong token." });
        }

        try
        {
            // 3. GỌI SERVICE XỬ LÝ LOGIC LỌC VÀ LÀM GIÀU DỮ LIỆU
            // Service sẽ tự động: 
            // a) Dùng Role và UserId để xác định phạm vi truy vấn (Tenant cá nhân vs Owner quản lý)
            // b) Gọi User Service và Property Service để lấy tên Tenant, Nhà, Phòng.
            var readings = await _monthlyReadingService.GetAllReadingsByRoleAsync(
                userId, 
                role, 
                ownerIdClaim 
            );
            
            // Ghi log thông báo thành công
            _logger.LogInformation("UserId {UserId} ({Role}) đã lấy thành công {Count} MonthlyReadings.", userId, role, readings.Count());

            return Ok(readings);
        }
        catch (Exception ex)
        {
            // Ghi log lỗi và trả về 500 Internal Server Error
            _logger.LogError(ex, "Lỗi khi lấy MonthlyReadings của user {UserId}", userId);
            return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy readings từ Service", error = ex.Message });
        }
    }

    /// <summary>
    /// API trả về hoá đơn có chỉ số điện bất thường (tiêu thụ điện > threshold)
    /// </summary>
    [Authorize(Roles = "Owner")]
    [HttpGet("abnormal-electric")]
    public async Task<ActionResult<IEnumerable<MonthlyReadingResponseDto>>> GetAbnormalElectricReadings([FromQuery] int threshold)
    {
        try
        {
            var allReadings = await _monthlyReadingService.GetAllAsync();
            var abnormal = allReadings.Where(r => (r.ElectricNew - r.ElectricOld > threshold)).ToList();
            return Ok(abnormal);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy MonthlyReadings điện bất thường");
            return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy readings điện bất thường", error = ex.Message });
        }
    }

    /// <summary>
    /// API trả về hoá đơn có chỉ số nước bất thường (tiêu thụ nước > threshold)
    /// </summary>
    [Authorize(Roles = "Owner")]
    [HttpGet("abnormal-water")]
    public async Task<ActionResult<IEnumerable<MonthlyReadingResponseDto>>> GetAbnormalWaterReadings([FromQuery] int threshold)
    {
        try
        {
            var allReadings = await _monthlyReadingService.GetAllAsync();
            var abnormal = allReadings.Where(r => (r.WaterNew - r.WaterOld > threshold)).ToList();
            return Ok(abnormal);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy MonthlyReadings nước bất thường");
            return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy readings nước bất thường", error = ex.Message });
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