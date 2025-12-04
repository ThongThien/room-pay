// ReadingService/Repositories/Interfaces/IReadingCycleRepository.cs

using ReadingService.Models; // Giả định đây là nơi Model ReadingCycle được định nghĩa
using System.Linq;

namespace ReadingService.Repositories.Interfaces;

public interface IReadingCycleRepository
{
    // Phương thức để lấy IQueryable, cho phép Service xây dựng truy vấn LINQ phức tạp
    IQueryable<ReadingCycle> Query();
    
    // Thêm các phương thức CRUD cơ bản nếu cần
    // Task AddAsync(ReadingCycle cycle);
}