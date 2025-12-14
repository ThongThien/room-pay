using Quartz;
using ReadingService.Features.User;
using System;
using System.Linq;
using System.Threading;
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

        // =================================================================
        // ⭐️ CHỌN 1 TRONG 2 CẤU HÌNH DƯỚI ĐÂY (PRODUCTION HOẶC DEMO)
        // =================================================================


#region CẤU HÌNH SẢN XUẤT (PRODUCTION) - RANDOM THỜI GIAN

    // Khởi tạo Random bên ngoài vòng lặp
    var random = new Random();
    
    // Ngày lên lịch cố định
    const string remindDayReading = "21"; // Ngày 21 hàng tháng
    
    // Khung thời gian cần random (8 giờ tối hôm nay đến 5 giờ chiều hôm sau)
    const int startHour = 20; // 8:00 PM
    const int endHour = 17;   // 5:00 PM (ngày hôm sau)
    
    // Tổng số phút trong khoảng từ 20:00 đến 17:00 ngày hôm sau (21 tiếng * 60 phút = 1260 phút)
    // Từ 20:00 -> 23:59: 4 giờ * 60 = 240 phút
    // Từ 00:00 -> 17:00: 17 giờ * 60 = 1020 phút
    // Tổng cộng: 240 + 1020 = 1260 phút.
    const int totalMinutesSlot = 1260; 

    _logger.LogInformation("Scheduled Reading Reminder Jobs (Production Config): Random time between 20:00 and 17:00 on day {Day}.", 
                            remindDayReading);
    
    foreach (var ownerId in allOwnerIds)
    {
        // 1. RANDOM SỐ PHÚT CHÊNH LỆCH
        // Random một giá trị từ 0 đến 1259 phút (để không vượt quá 17:00)
        int randomMinutesDelta = random.Next(0, totalMinutesSlot);

        // 2. TÍNH TOÁN GIỜ/PHÚT BẮT ĐẦU
        // Dùng DateTime để dễ dàng cộng dồn và xử lý tràn giờ/ngày
        // Giả định ngày lên lịch là Ngày 21 và bắt đầu từ 20:00
        DateTime startDate = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 
                                          int.Parse(remindDayReading), startHour, 0, 0);

        // Cộng số phút ngẫu nhiên
        DateTime finalRemindTime = startDate.AddMinutes(randomMinutesDelta);
        
        // 3. LẤY GIỜ, PHÚT CUỐI CÙNG (Quartz.NET chỉ cần giờ và phút)
        int remindHour = finalRemindTime.Hour;
        int remindMinute = finalRemindTime.Minute;
        
        // 4. LÊN LỊCH CHO OWNER NÀY
        _logger.LogInformation("   -> Owner {Id} scheduled for {Hour}:{Minute} on day {Day}.", 
                                ownerId, remindHour, remindMinute, remindDayReading);

        await ScheduleReminderJob(scheduler, ownerId, 
                                 "ReadingReminderJob", 
                                 remindDayReading, // "21"
                                 remindHour,       // Giờ ngẫu nhiên
                                 remindMinute,     // Phút ngẫu nhiên
                                 "Reading");
    }
    
    #endregion


        /* #region CẤU HÌNH THỬ NGHIỆM (DEMO) - CHẠY 1 PHÚT SAU
        
        // ⭐️ LOGIC THỬ NGHIỆM LỊCH TRÌNH: Chạy 1 phút sau thời điểm hiện tại
        var now = DateTime.Now;
        var remindMinuteReading = (now.Minute + 1) % 60; // 1 phút sau
        var remindHour = now.Hour; 
        var remindDay = now.Day.ToString(); // Chạy ngay trong ngày hôm nay, phải là string
        
        _logger.LogInformation("Scheduled Reading Reminder Jobs (DEMO Config): {Hour}:{Minute} on day {Day}.", 
                                remindHour, remindMinuteReading, remindDay);
        
        foreach (var ownerId in allOwnerIds)
        {
            await ScheduleReminderJob(scheduler, ownerId, 
                                     "ReadingReminderJob", 
                                     remindDay, // Day of Month
                                     remindHour, 
                                     remindMinuteReading, 
                                     "Reading");
        }
        
        #endregion
        */

        _logger.LogInformation("🛠️ [END] Dynamic Reading Reminder Scheduler Job Completed.");
    }
    
    // Hàm ScheduleReminderJob được sửa đổi để nhận Day dưới dạng string
    private async Task ScheduleReminderJob(
        IScheduler scheduler, 
        string ownerId, 
        string jobName, 
        string dayOfMonthExpression, // ⭐️ Cần phải là string (chấp nhận "21" hoặc "1/3" hoặc "1")
        int hour, 
        int minute, 
        string type)
    {
        var triggerKey = new TriggerKey($"{type}ReminderTrigger-{ownerId}");
        var jobKey = new JobKey(jobName);

        // Cron format: [second] [minute] [hour] [day of month] [month] [day of week]
        string cronExpression = $"0 {minute} {hour} {dayOfMonthExpression} * ?";

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
            await scheduler.ScheduleJob(trigger, CancellationToken.None); 
            _logger.LogInformation("   ✅ Scheduled {Type} for Owner {Id} to: {Cron}", type, ownerId, cronExpression);
        }
    }
}