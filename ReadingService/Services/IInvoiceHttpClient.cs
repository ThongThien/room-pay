namespace ReadingService.Services;

public interface IInvoiceHttpClient
{
    Task<bool> CreateInvoiceForMonthlyReadingAsync(string userId, int cycleId, int cycleMonth, int cycleYear, int electricUsage, int waterUsage,int? contractId = null);
}
