using NotificationService.Models;
using NotificationService.Repositories;

namespace NotificationService.Features.GetUserNotifications
{
    public class GetUserNotificationsQuery
    {
        public string UserId { get; set; } = string.Empty;
    }

    public class GetUserNotificationsQueryHandler
    {
        private readonly INotificationRepository _repository;

        public GetUserNotificationsQueryHandler(INotificationRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<NotificationDto>> Handle(GetUserNotificationsQuery query)
        {
            var notifications = await _repository.GetByUserIdAsync(query.UserId, 20);

            // Mapping sang DTO trước khi trả về
            return notifications.Select(n => new NotificationDto
            {
                Id = n.Id,
                Message = n.Message,
                Type = n.Type,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            }).ToList();
        }
    }
}