using NotificationService.Repositories;

namespace NotificationService.Features.MarkAsRead
{
    public class MarkAsReadCommand
    {
        public int NotificationId { get; set; }
        public string UserId { get; set; } = string.Empty; // Để xác minh quyền truy cập
    }

    public class MarkAsReadCommandHandler
    {
        private readonly INotificationRepository _repository;

        public MarkAsReadCommandHandler(INotificationRepository repository)
        {
            _repository = repository;
        }

        public async Task<bool> Handle(MarkAsReadCommand command)
        {
            return await _repository.MarkAsReadAsync(command.NotificationId, command.UserId);
        }
    }
}