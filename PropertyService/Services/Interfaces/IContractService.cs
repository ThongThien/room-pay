using PropertyService.DTOs.Contracts;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace PropertyService.Services.Interfaces 
{
    public interface IContractService
    {
        Task<ContractDto> CreateAsync(CreateContractDto dto, Guid ownerId);
        Task<ContractDto?> GetByIdAsync(int contractId, Guid ownerId); 
        Task<IEnumerable<ContractDto>> GetAllByOwnerIdAsync(Guid ownerId);
        Task<ContractDto?> UpdateAsync(int id, UpdateContractDto dto, Guid ownerId);
        Task<bool> DeleteAsync(int id, Guid ownerId);
        Task<ContractDto?> GetContractByIdAsync(int id);
        Task<IEnumerable<ContractDto>> GetAllContractsAsync();
        Task<bool> IsRoomOwnedByAsync(int roomId, Guid ownerId);
        Task<bool> IsContractOwnedByAsync(int contractId, Guid ownerId);
        Task<IEnumerable<ContractDto>> GetContractsByTenantIdAsync(Guid tenantId);
    }
}