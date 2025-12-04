// ReadingService/Repositories/Implementations/ReadingCycleRepository.cs

using ReadingService.Data; // Giả định ApplicationDbContext nằm ở đây
using ReadingService.Models;
using ReadingService.Repositories.Interfaces;
using System.Linq;

namespace ReadingService.Repositories.Implementations;

public class ReadingCycleRepository : IReadingCycleRepository
{
    private readonly ApplicationDbContext _context;

    public ReadingCycleRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    // Triển khai phương thức Query
    public IQueryable<ReadingCycle> Query()
    {
        return _context.ReadingCycles.AsQueryable();
    }
}