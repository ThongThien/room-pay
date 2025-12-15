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
    /// API Owner sử dụng để nhắc các Tenant chưa nộp chỉ số điện nước cho chu kỳ THÁNG HIỆN TẠI.
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
            // 2. TÌM TẤT CẢ CÁC CYCLE/TENANT CẦN NHẮC NHỞ TRONG THÁNG HIỆN TẠI
            // Hàm này trả về List<ReadingCycleDto> của các Tenant có MonthlyReading đang Pending.
            var pendingCycles = await _readingCycleService.GetPendingSubmissionCyclesByOwnerAsync(ownerId);
            
            if (pendingCycles == null || !pendingCycles.Any())
            {
                // Trả về OK nếu không có ai cần nhắc nhở
                return Ok(new { message = "Thành công: Không có khách hàng nào chưa nộp chỉ số trong chu kỳ tháng hiện tại." });
            }

            // 3. TRÍCH XUẤT THÔNG TIN KHÁCH HÀNG (Tenant) VÀ NHÓM THEO ID
            // Nhóm theo UserId để chỉ gửi 1 thông báo cho mỗi Tenant, ngay cả khi họ có nhiều Cycle Pending (trường hợp hiếm).
            var tenantsToRemindCycle = pendingCycles
                .GroupBy(c => c.UserId) 
                .Select(g => g.First())
                .ToList();
            
            // 4. Lấy thông tin UserInfo chi tiết của các Tenant
            var tenantIds = tenantsToRemindCycle.Select(c => c.UserId).ToList();
            var tenantsInfo = await _userService.GetUsersByIdsAsync(tenantIds); 
            
            if (tenantsInfo == null || !tenantsInfo.Any())
            {
                _logger.LogWarning($"Không tìm thấy thông tin chi tiết cho {tenantIds.Count} Tenant ID.");
                return NotFound(new { message = "Không tìm thấy thông tin chi tiết của khách hàng cần nhắc nhở." });
            }
            
            // 5. CHUẨN BỊ VÀ GỬI MESSAGE QUA RABBITMQ
            
            // Cần lấy OwnerName thực tế nếu có thể
            string ownerName = "Chủ nhà"; 
            var firstCycle = tenantsToRemindCycle.First(); // Lấy thông tin chu kỳ từ bản ghi đầu tiên

            var customersToNotify = tenantsInfo.Select(t => new UserInfo 
            {
                Id = t.Id, FullName = t.FullName, Email = t.Email, OwnerId = ownerId 
            }).ToList();

            var message = new ReadingNotificationMessage 
            {
                Type = NotificationType.RemindSubmission,
                ReadingCycleId = 0, // Đặt là 0 hoặc null vì thông báo này áp dụng cho nhiều Cycle/Tenant
                CustomersToNotify = customersToNotify,
                OwnerName = ownerName,
                CycleMonth = firstCycle.CycleMonth,
                CycleYear = firstCycle.CycleYear
            };
            
            _producer.SendMessage(message, _config["RabbitMQ:QueueName"] ?? "notification_queue");
            
            _logger.LogInformation($"Gửi nhắc nhở nộp chỉ số thành công cho {customersToNotify.Count} khách hàng.");

            return Ok(new 
            { 
                message = $"Đã gửi nhắc nhở nộp chỉ số thành công đến {customersToNotify.Count} khách hàng cho chu kỳ {firstCycle.CycleMonth}/{firstCycle.CycleYear}.",
                RecipientsCount = customersToNotify.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xử lý RemindSubmission theo Tenant Cycle");
            return StatusCode(500, new { message = "Có lỗi xảy ra khi gửi nhắc nhở." });
        }
    }

    /// <summary>
    /// Trigger auto invoice creation for current month (for testing purposes)
    /// Only creates invoices for tenants belonging to the calling owner
    /// </summary>
    [Authorize(Roles = "Owner")]
    [HttpPost("trigger-auto-invoice")]
    public async Task<IActionResult> TriggerAutoInvoice()
    {
        var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized(new { message = "Owner ID not found" });
        }

        try
        {
            await _monthlyReadingService.TriggerAutoInvoicesAsync(ownerId);
            return Ok(new { message = "Auto invoice trigger completed for your tenants. Check logs for details." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering auto invoice");
            return StatusCode(500, new { message = "Error triggering auto invoice", error = ex.Message });
        }
    }
}