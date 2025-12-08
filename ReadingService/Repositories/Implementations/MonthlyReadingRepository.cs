// ReadingService/Repositories/Implementations/MonthlyReadingRepository.cs

using ReadingService.Data; // Assuming ApplicationDbContext is located here
using ReadingService.Models;
using ReadingService.Repositories.Interfaces;
using System.Linq;

namespace ReadingService.Repositories.Implementations;

public class MonthlyReadingRepository : IMonthlyReadingRepository
{
    private readonly ApplicationDbContext _context;

    public MonthlyReadingRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    // Triển khai phương thức Query
    public IQueryable<MonthlyReading> Query()
    {
        return _context.MonthlyReadings.AsQueryable();
    }
}