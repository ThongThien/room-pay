using PropertyService.DTOs.Contracts;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using PropertyService.DTOs;

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
        Task<ContractDto?> GetActiveContractByTenantIdAsync(Guid tenantId);
        Task<IEnumerable<ContractDto>> GetExpiringContractsAsync(Guid ownerId, int daysThreshold = 30);
        Task<PropertyDetailsDto?> GetPropertyDetailsByContractIdAsync(int contractId);

        Task<IEnumerable<PropertyDetailsDto>> GetPropertyDetailsByContractIdsAsync(IEnumerable<int> contractIds);
    }
}