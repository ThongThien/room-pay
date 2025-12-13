using Quartz;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using InvoiceService.Services; // Giả định IUserServiceClient ở đây

namespace InvoiceService.Jobs;

[DisallowConcurrentExecution] 
public class InvoiceReminderSchedulerJob : IJob
{
    // ⭐️ Sử dụng IUserServiceClient để lấy OwnerIds qua HTTP (Microservice)
    private readonly IUserServiceClient _userServiceClient; 
    private readonly ISchedulerFactory _schedulerFactory;
    private readonly ILogger<InvoiceReminderSchedulerJob> _logger;

    public InvoiceReminderSchedulerJob(IUserServiceClient userServiceClient, ISchedulerFactory schedulerFactory, ILogger<InvoiceReminderSchedulerJob> logger)
    {
        _userServiceClient = userServiceClient;
        _schedulerFactory = schedulerFactory;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("🛠️ [START] Dynamic Invoice Reminder Scheduler Job. Scanning Owners...");
        
        var scheduler = await _schedulerFactory.GetScheduler();

        List<string> ownerIds;
        try
        {
            // 1. LẤY TẤT CẢ OWNER ID (Sử dụng Client HTTP Service)
            ownerIds = await _userServiceClient.GetAllOwnerIdsAsync(); 
            
            if (!ownerIds.Any())
            {
                _logger.LogWarning("⚠️ No active Owner IDs found for scheduling. Skipping.");
                return;
            }
            _logger.LogInformation("Found {Count} active Owners.", ownerIds.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error retrieving Owner IDs from User Service. Scheduling stopped.");
            return;
        }

        // 2. TẠO CẤU HÌNH LỊCH TRÌNH DYNAMIC (Ví dụ: 1 phút sau)
        var now = DateTime.Now;
        var remindMinutePayment = (now.Minute + 1) % 60; 
        var remindHour = now.Hour; 

        // 3. LÊN LỊCH DYNAMIC TRIGGER CHO TỪNG OWNER
        foreach (var ownerId in ownerIds)
        {
            await ScheduleReminderJob(scheduler, ownerId, 
                                     "PaymentReminderJob", // Tên Job Child
                                     now.Day, remindHour, remindMinutePayment, 
                                     "Payment");
        }
        
        _logger.LogInformation("🛠️ [END] Dynamic Invoice Reminder Scheduler Job Completed.");
    }
    
    // Hàm ScheduleReminderJob (Giữ nguyên)
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
            .UsingJobData("OwnerId", ownerId) 
            .WithCronSchedule(cronExpression)
            .Build();

        if (await scheduler.CheckExists(jobKey))
        {
            if (await scheduler.CheckExists(triggerKey))
            {
                await scheduler.RescheduleJob(triggerKey, trigger);
            }
            else
            {
                await scheduler.ScheduleJob(trigger);
            }
            _logger.LogInformation("   ✅ Scheduled {Type} for Owner {Id} to: {Cron}", type, ownerId, cronExpression);
        }
        else
        {
            _logger.LogError("   ❌ Job '{JobName}' not defined in Quartz configuration. Skipping scheduling for Owner {Id}.", jobName, ownerId);
        }
    }
}