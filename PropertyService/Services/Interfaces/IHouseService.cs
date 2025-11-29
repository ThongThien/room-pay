using PropertyService.DTOs.Houses;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PropertyService.Services.Interfaces;

public interface IHouseService
{
    Task<HouseDto> CreateAsync(CreateHouseDto dto, Guid ownerId);
    Task<IEnumerable<HouseDto>> GetAllAsync(Guid ownerId);
    Task<HouseDto?> GetByIdAsync(int id);
    Task UpdateAsync(int id, UpdateHouseDto dto);
    Task DeleteAsync(int id);
}
