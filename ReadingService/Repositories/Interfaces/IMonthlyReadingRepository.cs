// ReadingService/Repositories/Interfaces/IMonthlyReadingRepository.cs

using ReadingService.Models; // Giả định đây là nơi Model MonthlyReading được định nghĩa
using System.Linq;

namespace ReadingService.Repositories.Interfaces;

public interface IMonthlyReadingRepository
{
    // Phương thức để lấy IQueryable, cho phép Service xây dựng truy vấn LINQ phức tạp
    IQueryable<MonthlyReading> Query();
    
    // Thêm các phương thức CRUD cơ bản nếu cần
    // Task AddAsync(MonthlyReading reading);
}