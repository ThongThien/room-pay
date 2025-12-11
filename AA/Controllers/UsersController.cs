using AA.Features.Users;
using AA.Features.Users.DTOs;
using AA.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AA.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        IUserService userService,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        ILogger<UsersController> logger)
    {
        _userService = userService;
        _userManager = userManager;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Check if Tenant exists by ID (Service-to-service)
    /// </summary>
    /// <param name="userId">ID của người thuê</param>
    /// <returns>200 OK nếu tenant hợp lệ, 404 Not Found nếu không tồn tại</returns>
    [HttpGet("{userId}/exists")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckTenantExists(string userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest(new { error = "User ID is required" });
        }

        try
        {
            var exists = await _userService.CheckTenantExistenceAndRoleAsync(userId);

            if (!exists)
            {
                _logger.LogWarning($"User ID {userId} not found or is not a valid tenant");
                return NotFound(new { error = "Tenant not found or invalid" });
            }

            return Ok(new { message = "Tenant exists", userId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error checking user ID {userId}");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get user information by ID (Service-to-service)
    /// </summary>
    [HttpGet("{userId}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), 200)] 
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetUserById(string userId)
    {
        // Validate service API key
        var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
        var configuredApiKey = _configuration["ServiceApiKey"];
        
        if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
        {
            _logger.LogWarning("Invalid or missing API key for GetUserById");
            return Unauthorized(new { error = "Invalid or missing authentication" });
        }

        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
        {
            return NotFound(new { error = $"User with ID {userId} not found" });
        }

        return Ok(new
        {
            id = user.Id,
            fullName = user.FullName,
            email = user.Email,
            ownerId = user.OwnerId
        });
    }

    /// <summary>
    /// Get all users (tenants) owned by a specific owner (Service-to-service)
    /// </summary>
    [HttpGet("owner/{ownerId}/tenants")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTenantsByOwner(string ownerId)
    {
        // Validate service API key
        var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
        var configuredApiKey = _configuration["ServiceApiKey"];
        
        if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
        {
            _logger.LogWarning("Invalid or missing API key for GetTenantsByOwner");
            return Unauthorized(new { error = "Invalid or missing authentication" });
        }

        // Verify the owner exists
        var owner = await _userManager.FindByIdAsync(ownerId);
        if (owner == null)
        {
            return NotFound(new { error = $"Owner with ID {ownerId} not found" });
        }

        // Get all users where OwnerId = ownerId
        var tenants = await _userManager.Users
            .Where(u => u.OwnerId == ownerId)
            .Select(u => new
            {
                id = u.Id,
                fullName = u.FullName,
                email = u.Email,
                ownerId = u.OwnerId
            })
            .ToListAsync();

        return Ok(tenants);
    }

    /// <summary>
    /// Get all tenants (users with OwnerId not null) (Service-to-service)
    /// </summary>
    [HttpGet("tenants")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllTenants()
    {
        // Validate service API key
        var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
        var configuredApiKey = _configuration["ServiceApiKey"];
        
        if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
        {
            _logger.LogWarning("Invalid or missing API key for GetAllTenants");
            return Unauthorized(new { error = "Invalid or missing authentication" });
        }

        // Get all users where OwnerId is not null (tenants)
        var tenants = await _userManager.Users
            .Where(u => u.OwnerId != null)
            .Select(u => new
            {
                id = u.Id,
                fullName = u.FullName,
                email = u.Email,
                ownerId = u.OwnerId
            })
            .ToListAsync();

        return Ok(tenants);
    }

    /// <summary>
    /// Tạo người dùng mới (chỉ Owner)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto createUserDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            // Lấy userId của Owner từ JWT token
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(ownerId))
            {
                return Unauthorized(new { error = "Không thể xác định Owner" });
            }

            var result = await _userService.CreateUserAsync(createUserDto, ownerId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi tạo người dùng");
            return StatusCode(500, new UserResponseDto
            {
                Success = false,
                Message = "Đã xảy ra lỗi khi tạo người dùng"
            });
        }
    }

    /// <summary>
    /// Cập nhật thông tin người dùng (chỉ Owner)
    /// </summary>
    [HttpPut("{userId}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> UpdateUser(string userId, [FromBody] UpdateUserDto updateUserDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            // Lấy userId của Owner từ JWT token
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(ownerId))
            {
                return Unauthorized(new { error = "Không thể xác định Owner" });
            }

            var result = await _userService.UpdateUserAsync(userId, updateUserDto, ownerId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Lỗi khi cập nhật người dùng {userId}");
            return StatusCode(500, new UserResponseDto
            {
                Success = false,
                Message = "Đã xảy ra lỗi khi cập nhật người dùng"
            });
        }
    }

    /// <summary>
    /// Xóa người dùng (chỉ Owner)
    /// </summary>
    [HttpDelete("{userId}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> DeleteUser(string userId)
    {
        try
        {
            // Lấy userId của Owner từ JWT token
            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(ownerId))
            {
                return Unauthorized(new { error = "Không thể xác định Owner" });
            }

            var result = await _userService.DeleteUserAsync(userId, ownerId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Lỗi khi xóa người dùng {userId}");
            return StatusCode(500, new UserResponseDto
            {
                Success = false,
                Message = "Đã xảy ra lỗi khi xóa người dùng"
            });
        }
    }

    /// <summary>
    /// Get batch user information by IDs (Service-to-service)
    /// </summary>
    [HttpPost("batch-info")] //  ROUTE CẦN THIẾT
    [AllowAnonymous]
    [ProducesResponseType(typeof(List<object>), 200)] 
    public async Task<IActionResult> GetUsersBatch([FromBody] List<string> userIds)
    {
        // ... (logic xác thực API key) ...
        
        // Lấy thông tin chi tiết của các users dựa trên userIds
        var users = await _userManager.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new
            {
                id = u.Id,
                fullName = u.FullName,
                email = u.Email,
                ownerId = u.OwnerId
            })
            .ToListAsync();

        return Ok(users);
    }
}