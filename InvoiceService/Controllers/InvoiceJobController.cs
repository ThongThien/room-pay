using Microsoft.AspNetCore.Mvc;
using Quartz;

namespace InvoiceService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvoiceJobController : ControllerBase
{
    private readonly ISchedulerFactory _schedulerFactory;
    private readonly ILogger<InvoiceJobController> _logger;

    public InvoiceJobController(ISchedulerFactory schedulerFactory, ILogger<InvoiceJobController> logger)
    {
        _schedulerFactory = schedulerFactory;
        _logger = logger;
    }

    [HttpPost("trigger-visibility")]
    public async Task<IActionResult> TriggerVisibilityJob()
    {
        try
        {
            var scheduler = await _schedulerFactory.GetScheduler();
            var jobKey = new JobKey("InvoiceVisibilityJob");

            // Trigger job ngay lập tức
            await scheduler.TriggerJob(jobKey);

            _logger.LogInformation("Invoice visibility job triggered manually.");
            return Ok(new { message = "Invoice visibility job has been triggered successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering invoice visibility job.");
            return StatusCode(500, new { message = "An error occurred while triggering the job." });
        }
    }
}