using InvoiceService.Data;
using Microsoft.EntityFrameworkCore;
using Quartz;

namespace InvoiceService.Jobs;

public class InvoiceVisibilityJob : IJob
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<InvoiceVisibilityJob> _logger;

    public InvoiceVisibilityJob(IServiceProvider serviceProvider, ILogger<InvoiceVisibilityJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        using (var scope = _serviceProvider.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            try
            {
                // Cập nhật tất cả invoices có DisplayStatus là "Invisible" thành "Visible"
                var invoicesToUpdate = await dbContext.Invoices
                    .Where(i => i.DisplayStatus == "Invisible")
                    .ToListAsync();

                foreach (var invoice in invoicesToUpdate)
                {
                    invoice.DisplayStatus = "Visible";
                    invoice.UpdatedAt = DateTime.UtcNow;
                }

                await dbContext.SaveChangesAsync();

                _logger.LogInformation($"Updated {invoicesToUpdate.Count} invoices from Invisible to Visible.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating invoice visibility.");
            }
        }
    }
}