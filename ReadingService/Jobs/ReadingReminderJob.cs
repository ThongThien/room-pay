using Quartz;
using ReadingService.Features.ReadingCycle;
using ReadingService.Features.User;
using ReadingService.Services;
using System.Linq;

// Đảm bảo bạn đã using DTOs của User nếu cần
using ReadingService.Features.User.DTOs; 

namespace ReadingService.Jobs;

[DisallowConcurrentExecution] 
[PersistJobDataAfterExecution] 
public class ReadingReminderJob : IJob
{
    private readonly IReadingCycleService _readingCycleService; 
    private readonly IUserService _userService; 
    private readonly IMessageProducer _rabbitMqProducer;
    private readonly ILogger<ReadingReminderJob> _logger;

    public ReadingReminderJob(IReadingCycleService readingCycleService, 
                             IUserService userService, 
                             IMessageProducer rabbitMqProducer, 
                             ILogger<ReadingReminderJob> logger)
    {
        _readingCycleService = readingCycleService;
        _userService = userService;
        _rabbitMqProducer = rabbitMqProducer;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        // Lấy OwnerId từ JobDataMap
        string ownerId = context.MergedJobDataMap.GetString("OwnerId");
        
        if (string.IsNullOrEmpty(ownerId)) return;

        _logger.LogInformation("🟡 [START] Reading Submission Reminder Job for Owner: {OwnerId}", ownerId);

        try
        {
            // 1. TÌM CYCLE MỚI NHẤT
            var latestCycle = await _readingCycleService.GetLatestCycleByOwnerAsync(ownerId);
            
            if (latestCycle == null)
            {
                _logger.LogWarning("   ℹ️ No latest cycle found for Owner {OwnerId}. Skipping reminder.", ownerId);
                return; 
            }

            // 2. LẤY DANH SÁCH KHÁCH HÀNG CHƯA NỘP
            int ownerCycleId = latestCycle.Id; 
            // Giả định hàm này trả về List<UserInfo> hoặc DTO tương tự
            var tenantsToRemind = await _readingCycleService.GetTenantsMissingReadingAsync(ownerCycleId);
            
            if (tenantsToRemind.Any())
            {
                // 3. CHUẨN BỊ MESSAGE QUA RABBITMQ
                
                // ⭐️ DÙNG OWNER NAME CỐ ĐỊNH NHƯ LOGIC CONTROLLER CUNG CẤP
                string ownerName = "Chủ nhà"; 
                
                // ⭐️ CHUẨN BỊ CUSTOMERS TO NOTIFY
                // Giả định tenantsToRemind là List<UserInfo> hoặc DTO tương đương có các trường Id, FullName, Email
                var customersToNotify = tenantsToRemind.Select(t => new UserInfo 
                {
                    Id = t.Id, FullName = t.FullName, Email = t.Email, OwnerId = ownerId 
                }).ToList();


                // ⭐️ SỬ DỤNG CẤU TRÚC MESSAGE ĐÃ XÁC ĐỊNH
                // Giả định bạn đã có định nghĩa cho ReadingNotificationMessage và NotificationType
                var message = new 
                {
                    // Type = NotificationType.RemindSubmission, // Nếu dùng anonymous object
                    Type = "RemindSubmission",
                    ReadingCycleId = ownerCycleId,
                    CustomersToNotify = customersToNotify.Select(t => new { t.Id, t.FullName, t.Email }).ToList(),
                    OwnerName = ownerName,
                    CycleMonth = latestCycle.CycleMonth,
                    CycleYear = latestCycle.CycleYear
                };
                
                // Gửi message lên RabbitMQ
                _rabbitMqProducer.SendMessage(message, "notification_queue");
                
                _logger.LogInformation("   ✅ Sent submission reminder to {Count} tenants for Owner {OwnerId}", tenantsToRemind.Count(), ownerId);
            }
            else
            {
                _logger.LogInformation("   ℹ️ All tenants have submitted readings for Owner {OwnerId}. Skipping.", ownerId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ ERROR processing reading reminder for Owner {OwnerId}", ownerId);
        }
         _logger.LogInformation("🟡 [END] Reading Submission Reminder Job for Owner: {OwnerId}", ownerId);
    }
}