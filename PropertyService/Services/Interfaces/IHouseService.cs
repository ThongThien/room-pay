// PropertyService/Services/Interfaces/IHouseService.cs (FINAL)
using PropertyService.DTOs.Houses;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PropertyService.Services.Interfaces; // Cần dùng namespace chính xác

namespace PropertyService.Services.Interfaces
{
    public interface IHouseService
    {
        Task<HouseDto> CreateAsync(CreateHouseDto dto, Guid ownerId);
        Task<IEnumerable<HouseDto>> GetAllAsync(Guid ownerId);
        Task<HouseDto?> GetByIdAsync(int id);
        Task UpdateAsync(int id, UpdateHouseDto dto);
        Task DeleteAsync(int id);
        
        // --- PHƯƠNG THỨC MỚI: KIỂM TRA QUYỀN SỞ HỮU ---
        Task<bool> IsOwnedByAsync(int houseId, Guid ownerId);
        
        // --- PHƯƠNG THỨC MỚI: Dùng cho ContractService/Security ---
        Task<IEnumerable<HouseDto>> GetHousesOwnedByAsync(Guid ownerId);
    }
}