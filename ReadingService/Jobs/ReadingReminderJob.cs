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
            // 1. TÌM TẤT CẢ CÁC CYCLE/TENANT CẦN NHẮC NHỞ TRONG THÁNG HIỆN TẠI
            // SỬ DỤNG HÀM MỚI (đã sửa đổi logic của GetLatestCycleByOwnerAsync)
            // Hàm này trả về List<ReadingCycleDto> của các Tenant có MonthlyReading đang Pending.
            var pendingCycles = await _readingCycleService.GetPendingSubmissionCyclesByOwnerAsync(ownerId); // ⭐️ THAY THẾ
            
            if (pendingCycles == null || !pendingCycles.Any())
            {
                _logger.LogInformation("   ℹ️ No pending submission cycles found for Owner {OwnerId} in current month. Skipping reminder.", ownerId);
                return; 
            }

            // 2. TRÍCH XUẤT THÔNG TIN KHÁCH HÀNG (Tenant) VÀ NHÓM THEO ID
            // Nhóm theo UserId để chỉ gửi 1 thông báo cho mỗi Tenant
            var tenantsToRemindCycle = pendingCycles
                .GroupBy(c => c.UserId) 
                .Select(g => g.First())
                .ToList();

            // 3. Lấy thông tin UserInfo chi tiết của các Tenant
            var tenantIds = tenantsToRemindCycle.Select(c => c.UserId).ToList();
            var tenantsToRemind = await _userService.GetUsersByIdsAsync(tenantIds); 
            
            if (tenantsToRemind == null || !tenantsToRemind.Any())
            {
                _logger.LogWarning("   ℹ️ No detailed user info found for pending tenants of Owner {OwnerId}. Skipping.", ownerId);
                return;
            }

            // Dữ liệu chu kỳ để đưa vào message (Lấy từ bản ghi đầu tiên)
            var firstCycle = tenantsToRemindCycle.First();

            // 4. CHUẨN BỊ VÀ GỬI MESSAGE QUA RABBITMQ
            
            string ownerName = "Chủ nhà"; // Cần lấy Owner Name thực tế nếu có
            
            // CHUẨN BỊ CUSTOMERS TO NOTIFY
            var customersToNotify = tenantsToRemind.Select(t => new UserInfo 
            {
                Id = t.Id, FullName = t.FullName, Email = t.Email, OwnerId = ownerId 
            }).ToList();

            // SỬ DỤNG CẤU TRÚC MESSAGE ĐÃ XÁC ĐỊNH
            // Nếu ReadingNotificationMessage là một class định nghĩa, nên sử dụng nó
            var message = new 
            {
                Type = "RemindSubmission", // Giả định là string "RemindSubmission"
                ReadingCycleId = 0, // Đặt là 0 vì áp dụng cho nhiều Cycle
                CustomersToNotify = customersToNotify.Select(t => new { t.Id, t.FullName, t.Email }).ToList(),
                OwnerName = ownerName,
                CycleMonth = firstCycle.CycleMonth,
                CycleYear = firstCycle.CycleYear
            };
            
            // Gửi message lên RabbitMQ
            _rabbitMqProducer.SendMessage(message, "notification_queue");
            
            _logger.LogInformation("   ✅ Sent submission reminder to {Count} tenants for Owner {OwnerId} (Cycle: {Month}/{Year})", 
                customersToNotify.Count, ownerId, firstCycle.CycleMonth, firstCycle.CycleYear);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ ERROR processing reading reminder for Owner {OwnerId}", ownerId);
        }
        _logger.LogInformation("🟡 [END] Reading Submission Reminder Job for Owner: {OwnerId}", ownerId);
    }
}