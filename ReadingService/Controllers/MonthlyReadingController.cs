using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ReadingService.Features.MonthlyReading;
using ReadingService.Features.MonthlyReading.DTOs;
using ReadingService.Features.ReadingCycle;
using ReadingService.Data;
using ReadingService.Models;
using ReadingService.Services;
using ReadingService.Features.User.DTOs;
using ReadingService.DTOs;
using ReadingService.Enums;
using System.Net;
using Microsoft.EntityFrameworkCore;
using ReadingService.Features.User;
using ReadingService.Features.Property;
using ReadingService.Features.Property.DTOs;
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

    private readonly IMessageProducer _producer;
    private readonly IUserService _userService;
    private readonly IPropertyService _propertyService;
    public MonthlyReadingController(
        IMonthlyReadingService monthlyReadingService,
        IReadingCycleService readingCycleService,
        ILogger<MonthlyReadingController> logger,
        ApplicationDbContext context,
        IConfiguration config,
        IMessageProducer producer,
        IUserService userService,
        IPropertyService propertyService)
    {
        _monthlyReadingService = monthlyReadingService;
        _readingCycleService = readingCycleService;
        _logger = logger;
        _context = context;
        _config = config;
        _producer = producer;
        _userService = userService;
        _propertyService = propertyService;
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
    /// Get user's MonthlyReading by CycleId
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
    /// Get MonthlyReading information by ID
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
    /// Delete MonthlyReading
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
            // 3. CALL SERVICE TO HANDLE FILTERING AND DATA ENRICHMENT LOGIC
            // Service will automatically: 
            // a) Use Role and UserId to determine query scope (Individual Tenant vs Owner management)
            // b) Call User Service and Property Service to get Tenant names, House, Room.
            var readings = await _monthlyReadingService.GetAllReadingsByRoleAsync(
                userId, 
                role, 
                ownerIdClaim 
            );
            
            // Log success message
            _logger.LogInformation("UserId {UserId} ({Role}) successfully retrieved {Count} MonthlyReadings.", userId, role, readings.Count());

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
    /// API returns invoices with abnormal electric readings (electric consumption > threshold)
    /// </summary>
    [Authorize(Roles = "Owner")]
    [HttpGet("abnormal-electric")]
    public async Task<ActionResult<IEnumerable<MonthlyReadingResponseDto>>> GetAbnormalElectricReadings([FromQuery] int threshold)
    {
        try
        {
            // Get all readings with ReadingCycle included
            var allReadings = await _context.MonthlyReadings
                .Include(r => r.ReadingCycle)
                .ToListAsync();

            var abnormal = allReadings.Where(r => (r.ElectricNew - r.ElectricOld > threshold)).ToList();

            if (!abnormal.Any())
            {
                return Ok(new List<MonthlyReadingResponseDto>());
            }

            // Collect contractIds and userIds for enrichment
            var contractIds = abnormal
                .Where(r => r.TenantContractId.HasValue)
                .Select(r => r.TenantContractId!.Value)
                .Distinct()
                .ToList();

            var userIds = abnormal
                .Where(r => r.ReadingCycle != null)
                .Select(r => r.ReadingCycle!.UserId)
                .Distinct()
                .ToList();

            // Get property details
            var propertyDetailsMap = new Dictionary<int, PropertyDetailsDto>();
            if (contractIds.Any())
            {
                try
                {
                    var detailsList = await _propertyService.GetDetailsByContractIdsAsync(contractIds);
                    propertyDetailsMap = detailsList
                        .Where(d => d.ContractId.HasValue)
                        .ToDictionary(d => d.ContractId!.Value, d => d);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error calling PropertyService for abnormal electric readings");
                }
            }

            // Get user info
            var tenantMap = new Dictionary<string, string>();
            if (userIds.Any())
            {
                try
                {
                    var tenantInfos = await _userService.GetUsersByIdsAsync(userIds);
                    tenantMap = tenantInfos.ToDictionary(t => t.Id, t => t.FullName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error calling UserService for abnormal electric readings");
                }
            }

            // Map to response DTOs with enrichment
            var responseList = abnormal.Select(reading =>
            {
                var dto = new MonthlyReadingResponseDto
                {
                    Id = reading.Id,
                    CycleId = reading.CycleId,
                    ElectricOld = reading.ElectricOld,
                    ElectricNew = reading.ElectricNew,
                    ElectricPhotoUrl = reading.ElectricPhotoUrl,
                    WaterOld = reading.WaterOld,
                    WaterNew = reading.WaterNew,
                    WaterPhotoUrl = reading.WaterPhotoUrl,
                    Status = reading.Status,
                    CreatedAt = reading.CreatedAt,
                    UpdatedAt = reading.UpdatedAt,
                    TenantContractId = reading.TenantContractId,
                    TenantId = reading.ReadingCycle?.UserId ?? string.Empty,
                };

                // Enrich tenant name
                if (reading.ReadingCycle != null && tenantMap.TryGetValue(reading.ReadingCycle.UserId, out var tenantName))
                {
                    dto.TenantName = tenantName;
                }

                // Enrich property details
                if (reading.TenantContractId.HasValue && propertyDetailsMap.TryGetValue(reading.TenantContractId.Value, out var details))
                {
                    dto.HouseName = details.HouseName;
                    dto.RoomName = details.RoomName;
                    dto.Floor = details.Floor;
                }

                return dto;
            }).ToList();

            return Ok(responseList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy MonthlyReadings điện bất thường");
            return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy readings điện bất thường", error = ex.Message });
        }
    }

    /// <summary>
    /// API returns invoices with abnormal water readings (water consumption > threshold)
    /// </summary>
    [Authorize(Roles = "Owner")]
    [HttpGet("abnormal-water")]
    public async Task<ActionResult<IEnumerable<MonthlyReadingResponseDto>>> GetAbnormalWaterReadings([FromQuery] int threshold)
    {
        try
        {
            // Get all readings with ReadingCycle included
            var allReadings = await _context.MonthlyReadings
                .Include(r => r.ReadingCycle)
                .ToListAsync();

            var abnormal = allReadings.Where(r => (r.WaterNew - r.WaterOld > threshold)).ToList();

            if (!abnormal.Any())
            {
                return Ok(new List<MonthlyReadingResponseDto>());
            }

            // Collect contractIds and userIds for enrichment
            var contractIds = abnormal
                .Where(r => r.TenantContractId.HasValue)
                .Select(r => r.TenantContractId!.Value)
                .Distinct()
                .ToList();

            var userIds = abnormal
                .Where(r => r.ReadingCycle != null)
                .Select(r => r.ReadingCycle!.UserId)
                .Distinct()
                .ToList();

            // Get property details
            var propertyDetailsMap = new Dictionary<int, PropertyDetailsDto>();
            if (contractIds.Any())
            {
                try
                {
                    var detailsList = await _propertyService.GetDetailsByContractIdsAsync(contractIds);
                    propertyDetailsMap = detailsList
                        .Where(d => d.ContractId.HasValue)
                        .ToDictionary(d => d.ContractId!.Value, d => d);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error calling PropertyService for abnormal water readings");
                }
            }

            // Get user info
            var tenantMap = new Dictionary<string, string>();
            if (userIds.Any())
            {
                try
                {
                    var tenantInfos = await _userService.GetUsersByIdsAsync(userIds);
                    tenantMap = tenantInfos.ToDictionary(t => t.Id, t => t.FullName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error calling UserService for abnormal water readings");
                }
            }

            // Map to response DTOs with enrichment
            var responseList = abnormal.Select(reading =>
            {
                var dto = new MonthlyReadingResponseDto
                {
                    Id = reading.Id,
                    CycleId = reading.CycleId,
                    ElectricOld = reading.ElectricOld,
                    ElectricNew = reading.ElectricNew,
                    ElectricPhotoUrl = reading.ElectricPhotoUrl,
                    WaterOld = reading.WaterOld,
                    WaterNew = reading.WaterNew,
                    WaterPhotoUrl = reading.WaterPhotoUrl,
                    Status = reading.Status,
                    CreatedAt = reading.CreatedAt,
                    UpdatedAt = reading.UpdatedAt,
                    TenantContractId = reading.TenantContractId,
                    TenantId = reading.ReadingCycle?.UserId ?? string.Empty,
                };

                // Enrich tenant name
                if (reading.ReadingCycle != null && tenantMap.TryGetValue(reading.ReadingCycle.UserId, out var tenantName))
                {
                    dto.TenantName = tenantName;
                }

                // Enrich property details
                if (reading.TenantContractId.HasValue && propertyDetailsMap.TryGetValue(reading.TenantContractId.Value, out var details))
                {
                    dto.HouseName = details.HouseName;
                    dto.RoomName = details.RoomName;
                    dto.Floor = details.Floor;
                }

                return dto;
            }).ToList();

            return Ok(responseList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy MonthlyReadings nước bất thường");
            return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy readings nước bất thường", error = ex.Message });
        }
    }

    /// <summary>
    /// Proxy S3 image: return image from S3 (used for frontend)
    /// </summary>
    [AllowAnonymous]
    [HttpGet("image-proxy")]
    public async Task<IActionResult> GetS3Image([FromQuery] string key)
    {
        // Read AWS config from appsettings
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

    /// <summary>
    /// API Owner sử dụng để nhắc các Tenant chưa nộp chỉ số điện nước cho chu kỳ MỚI NHẤT.
    /// Endpoint: POST api/MonthlyReading/remind-submission/latest
    /// </summary>
    [Authorize(Roles = "Owner")]
    [HttpPost("remind-submission/latest")] 
    public async Task<IActionResult> RemindSubmissionLatest()
    {
        // 1. TRÍCH XUẤT OWNER ID
        var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                        ?? User.FindFirstValue("sub") 
                        ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin Owner" });
        }
        
        try
        {
            // 2. TÌM CYCLE MỚI NHẤT
            // Hàm này trả về ReadingCycleDto của bản ghi ReadingCycle DO OWNER tạo ra 
            var latestCycle = await _readingCycleService.GetLatestCycleByOwnerAsync(ownerId);
            
            if (latestCycle == null)
            {
                return NotFound(new { message = "Không tìm thấy chu kỳ đọc chỉ số mới nhất hoặc đang hoạt động." });
            }

            // ID này là ID của ReadingCycle bản ghi chung (thuộc Owner)
            int ownerCycleId = latestCycle.Id; 

            // 3. GỌI SERVICE LẤY DANH SÁCH KHÁCH HÀNG CHƯA NỘP CHỈ SỐ
            var tenantsToRemind = await _readingCycleService.GetTenantsMissingReadingAsync(ownerCycleId);
            
            if (tenantsToRemind == null || !tenantsToRemind.Any())
            {
                return Ok(new { message = $"Thành công: Không có khách hàng nào chưa nộp chỉ số cho chu kỳ mới nhất (ID {ownerCycleId})." });
            }

            // 4. CHUẨN BỊ VÀ GỬI MESSAGE QUA RABBITMQ
            
            // OwnerName cần được lấy từ UserService (giả định)
            // Nếu chưa có UserService, tạm thời dùng Owner ID để tránh lỗi.
            string ownerName = "Chủ nhà"; // Sửa lại: Lấy từ UserService nếu có
            
            var customersToNotify = tenantsToRemind.Select(t => new UserInfo // ⭐️ Sử dụng UserInfo đã được using
            {
                Id = t.Id, FullName = t.FullName, Email = t.Email, OwnerId = t.OwnerId 
            }).ToList();

            var message = new ReadingNotificationMessage 
            {
                Type = NotificationType.RemindSubmission,
                ReadingCycleId = ownerCycleId,
                CustomersToNotify = customersToNotify,
                OwnerName = ownerName,
                CycleMonth = latestCycle.CycleMonth,
                CycleYear = latestCycle.CycleYear
            };
            
            // ⭐️ Sửa lỗi CS1503/CS0828 (Giả định): đảm bảo SendMessage được gọi đúng cú pháp.
            // Nếu lỗi vẫn còn, cần kiểm tra code chi tiết dòng 345, 349, 350.
            _producer.SendMessage(message, _config["RabbitMQ:QueueName"] ?? "notification_queue");
            
            _logger.LogInformation($"Gửi nhắc nhở nộp chỉ số thành công cho {tenantsToRemind.Count()} khách hàng (Cycle ID: {ownerCycleId}).");

            return Ok(new 
            { 
                message = $"Đã gửi nhắc nhở nộp chỉ số thành công đến {tenantsToRemind.Count()} khách hàng cho chu kỳ {latestCycle.CycleMonth}/{latestCycle.CycleYear}.",
                RecipientsCount = tenantsToRemind.Count()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xử lý RemindSubmission cho Cycle mới nhất");
            return StatusCode(500, new { message = "Có lỗi xảy ra khi gửi nhắc nhở." });
        }
    }
}