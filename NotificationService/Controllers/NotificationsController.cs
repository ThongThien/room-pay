using Microsoft.AspNetCore.Mvc;
using NotificationService.Features.GetUserNotifications;
using NotificationService.Features.MarkAsRead;
using NotificationService.Repositories;
using NotificationService.Models;

namespace NotificationService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // Giả định bạn có cơ chế xác thực để lấy được User ID
    // [Authorize] 
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationRepository _repository;
        
        // Constructor nhận Repository
        public NotificationsController(INotificationRepository repository)
        {
            _repository = repository;
        }

        // GET api/notifications/{userId}
        [HttpGet("{userId}")]
        [ProducesResponseType(typeof(List<NotificationDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> Get(string userId)
        {
            // Sử dụng Query/Handler pattern (thư mục Features)
            var result = await new GetUserNotificationsQueryHandler(_repository).Handle(
                new GetUserNotificationsQuery { UserId = userId }
            );
            
            return Ok(result);
        }

        // POST api/notifications/mark-as-read
        [HttpPost("mark-as-read")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> MarkAsRead([FromBody] MarkAsReadCommand command)
        {
            // Sử dụng Command/Handler pattern
            var success = await new MarkAsReadCommandHandler(_repository).Handle(command);

            if (!success)
            {
                return NotFound($"Notification {command.NotificationId} not found or access denied.");
            }
            return NoContent();
        }

        // GET api/notifications/unread-count/{userId}
        [HttpGet("unread-count/{userId}")]
        public async Task<IActionResult> GetUnreadCount(string userId)
        {
            var count = await _repository.CountUnreadAsync(userId);
            return Ok(new { Count = count });
        }
    }
}