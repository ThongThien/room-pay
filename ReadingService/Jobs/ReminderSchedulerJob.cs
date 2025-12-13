using Quartz;
using ReadingService.Features.User;
using System;
using System.Linq;
using System.Threading; // Cần thêm để sử dụng CancellationToken
using System.Threading.Tasks;

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

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("🛠️ [START] Dynamic Reading Reminder Scheduler Job. Scanning Owners...");
        
        var scheduler = await _schedulerFactory.GetScheduler();
        
        List<string> allOwnerIds;
        try
        {
            // LẤY TẤT CẢ OWNER ID từ AA Service
            allOwnerIds = await _userService.GetAllOwnerIdsAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error retrieving Owner IDs. Scheduling stopped.");
            return;
        }


        if (!allOwnerIds.Any())
        {
            _logger.LogWarning("⚠️ No active Owner IDs found to schedule reminders. Skipping.");
            return;
        }

        // ⭐️ LOGIC THỬ NGHIỆM LỊCH TRÌNH: Chạy 1 phút sau thời điểm hiện tại
        var now = DateTime.Now;
        var remindMinuteReading = (now.Minute + 1) % 60; // 1 phút sau
        var remindHour = now.Hour; 
        var remindDay = now.Day; // Chạy ngay trong ngày hôm nay

        _logger.LogInformation("Scheduled Reading Reminder Jobs to run at {Hour}:{Minute} on day {Day} (Test Config).", 
                                remindHour, remindMinuteReading, remindDay);
        
        foreach (var ownerId in allOwnerIds)
        {
            // --- 1. CHỈ LÊN LỊCH NHẮC NỘP CHỈ SỐ (ReadingReminderJob) ---
            await ScheduleReminderJob(scheduler, ownerId, 
                                     "ReadingReminderJob", 
                                     remindDay, // Day of Month
                                     remindHour, 
                                     remindMinuteReading, 
                                     "Reading");
        }
        
        _logger.LogInformation("🛠️ [END] Dynamic Reading Reminder Scheduler Job Completed.");
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
            .UsingJobData("OwnerId", ownerId) // Truyền OwnerId vào Job
            .WithCronSchedule(cronExpression)
            .Build();

        if (await scheduler.CheckExists(triggerKey))
        {
            await scheduler.RescheduleJob(triggerKey, trigger);
            _logger.LogInformation("   🔄 Rescheduled {Type} for Owner {Id} to: {Cron}", type, ownerId, cronExpression);
        }
        else
        {
            // Phải đảm bảo Job đã được khai báo là .StoreDurably() trong Program.cs
            await scheduler.ScheduleJob(trigger, CancellationToken.None); 
            _logger.LogInformation("   ✅ Scheduled {Type} for Owner {Id} to: {Cron}", type, ownerId, cronExpression);
        }
    }
}