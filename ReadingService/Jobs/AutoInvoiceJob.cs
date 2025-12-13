using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ReadingService.Data;
using ReadingService.Services;
using ReadingService.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ReadingService.Jobs;

public class AutoInvoiceJob : BackgroundService
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

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAutoInvoicesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AutoInvoiceJob");
            }

            // Chạy hàng ngày lúc 0h
            var now = DateTime.Now;
            var nextRun = now.Date.AddDays(1);
            var delay = nextRun - now;
            await Task.Delay(delay, stoppingToken);
        }
    }

    private async Task ProcessAutoInvoicesAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var _context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var currentMonth = DateTime.Now.Month;
        var currentYear = DateTime.Now.Year;
        var currentDay = DateTime.Now.Day;

        if (currentDay < 25) return; // Chỉ chạy từ ngày 25 trở đi

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
                var tenantUserId = reading.ReadingCycle?.UserId;
                if (string.IsNullOrEmpty(tenantUserId))
                {
                    _logger.LogWarning("Skipping auto invoice for reading {ReadingId}: UserId is null", reading.Id);
                    continue;
                }

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