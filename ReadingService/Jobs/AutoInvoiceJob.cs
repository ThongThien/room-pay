using Microsoft.Extensions.Logging;
using ReadingService.Data;
using ReadingService.Services;
using ReadingService.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Linq;
using System.Threading.Tasks;
using Quartz;

namespace ReadingService.Jobs;

public class AutoInvoiceJob : IJob
{
    private readonly ILogger<AutoInvoiceJob> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IInvoiceHttpClient _invoiceHttpClient;

    public AutoInvoiceJob(ILogger<AutoInvoiceJob> logger, IServiceScopeFactory scopeFactory, IInvoiceHttpClient invoiceHttpClient)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _invoiceHttpClient = invoiceHttpClient;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        try
        {
            await ProcessAutoInvoicesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AutoInvoiceJob");
        }
    }

    private async Task ProcessAutoInvoicesAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var _context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var currentMonth = DateTime.Now.Month;
        var currentYear = DateTime.Now.Year;

        _logger.LogInformation("Processing auto invoices for {Month}/{Year}", currentMonth, currentYear);

        var readings = await _context.MonthlyReadings
            .Include(r => r.ReadingCycle)
            .Where(r => r.Status != ReadingStatus.Confirmed &&
                        r.Status != ReadingStatus.AutoInvoiced &&
                        r.ReadingCycle.CycleMonth == currentMonth &&
                        r.ReadingCycle.CycleYear == currentYear)
            .ToListAsync();

        _logger.LogInformation("Found {Count} readings to process for auto invoices", readings.Count);

        foreach (var reading in readings)
        {
            try
            {
                if (reading.ReadingCycle == null || string.IsNullOrEmpty(reading.ReadingCycle.UserId))
                {
                    _logger.LogWarning("Skipping auto invoice for reading {ReadingId}: ReadingCycle or UserId is null", reading.Id);
                    continue;
                }

                var tenantUserId = reading.ReadingCycle.UserId;

                if (reading.TenantContractId == null)
                {
                    _logger.LogWarning("Skipping auto invoice for reading {ReadingId}: TenantContractId is null", reading.Id);
                    continue;
                }

                var success = await _invoiceHttpClient.CreateInvoiceForMonthlyReadingAsync(
                    tenantUserId,
                    reading.CycleId,
                    currentMonth,
                    currentYear,
                    0, // electricUsage
                    0, // waterUsage
                    reading.TenantContractId
                );

                if (success)
                {
                    _logger.LogInformation("Auto invoice created for user {UserId}, cycle {CycleId}", tenantUserId, reading.CycleId);

                    // Đánh dấu đã tạo auto invoice
                    reading.Status = ReadingStatus.AutoInvoiced;
                    await _context.SaveChangesAsync();
                }
                else
                {
                    _logger.LogWarning("Failed to create auto invoice for user {UserId}, cycle {CycleId}", tenantUserId, reading.CycleId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating auto invoice for cycle {CycleId}", reading.CycleId);
            }
        }
    }
}