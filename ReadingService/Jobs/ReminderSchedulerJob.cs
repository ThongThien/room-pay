using Quartz;
using ReadingService.Features.User;
using System.Linq;

namespace ReadingService.Jobs;

[DisallowConcurrentExecution] 
public class ReminderSchedulerJob : IJob
{
    private readonly IUserService _userService;
    private readonly ISchedulerFactory _schedulerFactory;
    private readonly ILogger<ReminderSchedulerJob> _logger;

    public ReminderSchedulerJob(IUserService userService, ISchedulerFactory schedulerFactory, ILogger<ReminderSchedulerJob> logger)
    {
        _userService = userService;
        _schedulerFactory = schedulerFactory;
        _logger = logger;
    }

    // public async Task Execute(IJobExecutionContext context)
    // {
    //     _logger.LogInformation("🛠️ [START] Dynamic Reminder Scheduler Job. Scanning Owners...");
        
    //     var scheduler = await _schedulerFactory.GetScheduler();
    //     var allOwnerIds = await _userService.GetAllOwnerIdsAsync();

    //     if (allOwnerIds == null || !allOwnerIds.Any())
    //     {
    //         _logger.LogWarning("⚠️ No active Owner IDs found to schedule reminders.");
    //         return;
    //     }

    //     // ⚠️ GIẢ ĐỊNH: Lấy Cấu hình Reminder (Ngày/Giờ)
    //     // Trong môi trường thực tế, IUserService cần có hàm để lấy các giá trị này từ DB/Config.
        
    //     // --- GIẢ LẬP DỮ LIỆU CẤU HÌNH THEO TỪNG OWNER (Dùng để chứng minh tính Dynamic) ---
    //     var reminderConfigs = allOwnerIds.Select((id, index) => new 
    //     {
    //         OwnerId = id,
    //         // Ví dụ: Owner đầu tiên nhắc nhở lúc 8h, Owner thứ hai lúc 10h, v.v.
    //         // Nếu không config, đặt mặc định:
    //         RemindReadingDay = 21, 
    //         RemindReadingHour = 8 + (index % 3), // 8h, 9h, 10h tùy Owner
    //         RemindPaymentDay = 25,
    //         RemindPaymentHour = 10 + (index % 3) // 10h, 11h, 12h tùy Owner
    //     }).ToList();
        
    //     foreach (var config in reminderConfigs)
    //     {
    //         // --- 1. LÊN LỊCH NHẮC NỘP CHỈ SỐ (Ngày 21) ---
    //         await ScheduleReminderJob(scheduler, config.OwnerId, 
    //                                  "ReadingReminderJob", 
    //                                  config.RemindReadingDay, 
    //                                  config.RemindReadingHour, 
    //                                  0, // Phút
    //                                  "Reading");
            
    //         // --- 2. LÊN LỊCH NHẮC THANH TOÁN (Ngày 25) ---
    //         await ScheduleReminderJob(scheduler, config.OwnerId, 
    //                                  "PaymentReminderJob", 
    //                                  config.RemindPaymentDay, 
    //                                  config.RemindPaymentHour, 
    //                                  0, // Phút
    //                                  "Payment");
    //     }
        
    //     _logger.LogInformation("🛠️ [END] Dynamic Reminder Scheduler Job Completed.");
    // }
    
    // private async Task ScheduleReminderJob(
    //     IScheduler scheduler, string ownerId, string jobName, int day, int hour, int minute, string type)
    // {
    //     var triggerKey = new TriggerKey($"{type}ReminderTrigger-{ownerId}");
    //     var jobKey = new JobKey(jobName);

    //     // Cron format: [second] [minute] [hour] [day of month] [month] [day of week]
    //     string cronExpression = $"0 {minute} {hour} {day} * ?"; 

    //     var trigger = TriggerBuilder.Create()
    //         .WithIdentity(triggerKey)
    //         .ForJob(jobKey)
    //         .UsingJobData("OwnerId", ownerId) // Truyền OwnerId vào Job
    //         .WithCronSchedule(cronExpression)
    //         .Build();

    //     if (await scheduler.CheckExists(triggerKey))
    //     {
    //         await scheduler.RescheduleJob(triggerKey, trigger);
    //         _logger.LogInformation("   🔄 Rescheduled {Type} for Owner {Id} to: {Cron}", type, ownerId, cronExpression);
    //     }
    //     else
    //     {
    //         // Phải đảm bảo Job đã được khai báo ở Program.cs (Bước 3)
    //         await scheduler.ScheduleJob(trigger, CancellationToken.None); 
    //         _logger.LogInformation("   ✅ Scheduled {Type} for Owner {Id} to: {Cron}", type, ownerId, cronExpression);
    //     }
    // }


    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("🛠️ [START] Dynamic Reminder Scheduler Job. Scanning Owners...");
        
        var scheduler = await _schedulerFactory.GetScheduler();

        // ⚠️ GIẢ ĐỊNH OWNER VÀ CẤU HÌNH TEST
        // Bạn CẦN đảm bảo các Owner IDs này tồn tại trong hệ thống User của bạn
        // để logic lấy Tenant IDs không bị lỗi.
        var ownerId1 = "02e85a2a-1f0b-4636-864b-8dd723a61a4a"; // Owner 1: Nhắc nộp lúc 1 phút sau khi Master Job chạy
        var ownerId2 = "189c679f-d209-4193-a5a2-8b470f2fc1ec"; // Owner 2: Nhắc nộp lúc 2 phút sau khi Master Job chạy
        
        var now = DateTime.Now;
        var remindMinute1 = (now.Minute + 1) % 60; // 1 phút sau
        var remindMinute2 = (now.Minute + 2) % 60; // 2 phút sau
        var remindHour = now.Hour; 
        
        // Xử lý trường hợp phút vượt qua 59
        if (remindMinute1 < now.Minute) remindHour = (now.Hour + 1) % 24;


        var reminderConfigs = new List<dynamic>
        {
            new 
            {
                OwnerId = ownerId1,
                RemindReadingDay = now.Day, // Chạy ngay trong ngày hôm nay
                RemindReadingHour = remindHour,
                RemindReadingMinute = remindMinute1
            },
            new 
            {
                OwnerId = ownerId2,
                RemindReadingDay = now.Day, 
                RemindReadingHour = remindHour,
                RemindReadingMinute = remindMinute2
            }
        };
        
        // ----------------------------------------------------------------------
        // LÊN LỊCH DYNAMIC TRIGGER CHO TỪNG OWNER
        // ----------------------------------------------------------------------

        foreach (var config in reminderConfigs)
        {
            // --- 1. LÊN LỊCH NHẮC NỘP CHỈ SỐ (Chỉ test Reading Reminder) ---
            await ScheduleReminderJob(scheduler, config.OwnerId, 
                                     "ReadingReminderJob", // Tên Job Child
                                     config.RemindReadingDay, 
                                     config.RemindReadingHour, 
                                     config.RemindReadingMinute, // Sử dụng phút động
                                     "Reading");
        }
        
        _logger.LogInformation("🛠️ [END] Dynamic Reminder Scheduler Job Completed.");
    }
    
    private async Task ScheduleReminderJob(
        IScheduler scheduler, string ownerId, string jobName, int day, int hour, int minute, string type)
    {
        var triggerKey = new TriggerKey($"{type}ReminderTrigger-{ownerId}");
        var jobKey = new JobKey(jobName);

        // Cron format: [second] [minute] [hour] [day of month] [month] [day of week]
        string cronExpression = $"0 {minute} {hour} {day} * ?"; 

        var trigger = TriggerBuilder.Create()
            .WithIdentity(triggerKey)
            .ForJob(jobKey)
            .UsingJobData("OwnerId", ownerId) // ⭐️ Truyền OwnerId vào Job
            .WithCronSchedule(cronExpression)
            .Build();

        // Lên lịch hoặc cập nhật Job/Trigger
        if (await scheduler.CheckExists(triggerKey))
        {
            await scheduler.RescheduleJob(triggerKey, trigger);
            _logger.LogInformation("   🔄 Rescheduled {Type} for Owner {Id} to: {Cron}", type, ownerId, cronExpression);
        }
        else
        {
            // Nếu Job chưa có Trigger nào, tạo Trigger mới.
            await scheduler.ScheduleJob(trigger, CancellationToken.None); 
            _logger.LogInformation("   ✅ Scheduled {Type} for Owner {Id} to: {Cron}", type, ownerId, cronExpression);
        }
    }
}