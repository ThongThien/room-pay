using AutoMapper;
using PropertyService.DTOs.Contracts;
using PropertyService.Models;
using PropertyService.Services.Interfaces; 
using PropertyService.Repositories;
using PropertyService.Services.Clients;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PropertyService.Models.Enums; 
using Microsoft.EntityFrameworkCore;
using System.Linq;
using Microsoft.Extensions.Logging;
namespace PropertyService.Services;

public class ContractService : IContractService
{
    private readonly IGenericRepository<TenantContracts> _contractRepo;
    private readonly IRoomService _roomService; 
    private readonly IHouseService _houseService;
    private readonly IUserServiceClient _userService;
    private readonly IMapper _mapper;

    public ContractService(
        IGenericRepository<TenantContracts> contractRepo,
        IRoomService roomService,
        IHouseService houseService,
        IUserServiceClient userService,
        IMapper mapper)
    {
        _contractRepo = contractRepo;
        _roomService = roomService;
        _houseService = houseService;
        _userService = userService;
        _mapper = mapper;
    }
    public async Task<ContractDto> CreateAsync(CreateContractDto dto, Guid ownerId)
    {
        // 1. KIỂM TRA TỒN TẠI VÀ TRẠNG THÁI PHÒNG
        var room = await _roomService.GetRoomByIdForContractAsync(dto.RoomId);

        if (room == null)
        {
            throw new InvalidOperationException($"Room ID {dto.RoomId} not found.");
        }
        
        // 3. KIỂM TRA TRẠNG THÁI PHÒNG (SỬ DỤNG PascalCase)
        if (room.Status != RoomStatus.Vacant) 
        {
            // Giả định RoomStatus.Vacant là trạng thái Enum
            throw new InvalidOperationException($"Room {dto.RoomId} is currently {room.Status} and cannot be rented.");
        }

        // 4. KIỂM TRA TỒN TẠI TENANT (Gọi Microservice AA)
        var user = await _userService.GetUserByIdAsync(dto.TenantId.ToString());
        if (user == null)
        {
             throw new InvalidOperationException("Tenant ID is invalid or does not exist in User Service.");
        }

        // 5. TẠO CONTRACT
        var contract = _mapper.Map<TenantContracts>(dto);
        contract.Status = ContractStatus.Active; // SỬ DỤNG PascalCase

        await _contractRepo.AddAsync(contract);

        // 6. CẬP NHẬT TRẠNG THÁI PHÒNG
        await _roomService.UpdateStatusAsync(dto.RoomId, RoomStatus.Occupied);

        return _mapper.Map<ContractDto>(contract);
    }
    
    // ⭐ GET ALL CONTRACTS BY OWNER ID
    public async Task<IEnumerable<ContractDto>> GetAllByOwnerIdAsync(Guid ownerId)
    {
        var houses = await _houseService.GetHousesOwnedByAsync(ownerId); 
        var houseIds = houses.Select(h => h.Id).ToList();

        var contracts = await _contractRepo.Query()
             .Include(c => c.Room) 
             .Where(c => c.Room != null && houseIds.Contains(c.Room.HouseId))
             .ToListAsync();

        return _mapper.Map<IEnumerable<ContractDto>>(contracts);
    }
    
    // ⭐ GET BY ID (Dùng cho Controller check quyền)
    public async Task<ContractDto?> GetByIdAsync(int contractId, Guid ownerId)
    {
        // Controller đã kiểm tra quyền sở hữu, ta chỉ cần lấy Contract
        var contract = await _contractRepo.GetByIdAsync(contractId);
        
        if (contract == null) return null;
        
        // Kiểm tra lại quyền sở hữu một lần nữa nếu cần (Mặc định: Controller đã lo)
        if (!await IsContractOwnedByAsync(contractId, ownerId)) return null;

        return _mapper.Map<ContractDto>(contract);
    }
    
    // ⭐ UPDATE CONTRACT
    public async Task<ContractDto?> UpdateAsync(int id, UpdateContractDto dto, Guid ownerId)
    {
        var contract = await _contractRepo.GetByIdAsync(id);
        if (contract == null) return null;

        // Xử lý RoomStatus nếu hợp đồng kết thúc/bị hủy
        if (dto.Status == ContractStatus.Ended)
        {
            await _roomService.UpdateStatusAsync(contract.RoomId, RoomStatus.Vacant);
        }
        
        _mapper.Map(dto, contract);
        await _contractRepo.UpdateAsync(contract);

        return _mapper.Map<ContractDto>(contract);
    }
    
    // ⭐ DELETE CONTRACT
    public async Task<bool> DeleteAsync(int id, Guid ownerId)
    {
        var contract = await _contractRepo.GetByIdAsync(id);
        if (contract == null) return false;

        // Cập nhật trạng thái phòng thành VACANT
        await _roomService.UpdateStatusAsync(contract.RoomId, RoomStatus.Vacant);

        await _contractRepo.DeleteAsync(contract);
        return true;
    }

    // =================================================================
    // ⭐ TRIỂN KHAI PHƯƠNG THỨC CŨ (ĐỂ KHỚP VỚI IContractService của bạn)
    // =================================================================

    // Triển khai phương thức cũ cho ContractController.GetContract(int id)
    public async Task<ContractDto?> GetContractByIdAsync(int id)
    {
        var contract = await _contractRepo.GetByIdAsync(id);
        return _mapper.Map<ContractDto>(contract);
    }

    // Triển khai phương thức cũ cho ContractController.GetContracts()
    public async Task<IEnumerable<ContractDto>> GetAllContractsAsync()
    {
        // Tạm thời trả về tất cả hợp đồng (vì Controller có Authorize Owner)
        var contracts = await _contractRepo.GetAllAsync();
        return _mapper.Map<IEnumerable<ContractDto>>(contracts);
    }
// ContractService.cs

    public async Task<IEnumerable<ContractDto>> GetContractsByTenantIdAsync(Guid tenantId)
    {
        string tenantIdString = tenantId.ToString();
        
        var contracts = await _contractRepo.Query()
            // Truy vấn các hợp đồng có TenantId khớp với ID từ token
            .Where(c => c.TenantId == tenantIdString) 
            .ToListAsync();
            
        return _mapper.Map<IEnumerable<ContractDto>>(contracts);
    }
    // Triển khai phương thức cũ (Map CreateContract -> CreateContractDto -> CreateAsync)
    public Task<ContractDto?> CreateContractAsync(CreateContractDto request) 
    {
        throw new NotImplementedException("Phải sử dụng phương thức CreateAsync(CreateContractDto dto, Guid ownerId) để kiểm tra bảo mật.");
    }
    
    // Triển khai phương thức cũ (Map UpdateContract-> UpdateContractDto -> UpdateAsync)
    public Task<ContractDto?> UpdateContractAsync(int id, UpdateContractDto request) 
    {
        throw new NotImplementedException("Phải sử dụng phương thức UpdateAsync(int id, UpdateContractDto dto, Guid ownerId) để kiểm tra bảo mật.");
    }
    
    // Triển khai phương thức cũ
    public Task<bool> DeleteContractAsync(int id)
    {
        throw new NotImplementedException("Phải sử dụng phương thức DeleteAsync(int id, Guid ownerId) để kiểm tra bảo mật.");
    }


    // =================================================================
    // ⭐ LOGIC KIỂM TRA QUYỀN SỞ HỮU
    // =================================================================
    
    // ⭐ KIỂM TRA QUYỀN SỞ HỮU ROOM
    public async Task<bool> IsRoomOwnedByAsync(int roomId, Guid ownerId)
    {
        var houseId = await _roomService.GetHouseIdByRoomIdAsync(roomId);
        
        if (houseId == null) return false; 

        return await _houseService.IsOwnedByAsync(houseId.Value, ownerId);
    }

    // ⭐ KIỂM TRA QUYỀN SỞ HỮU CONTRACT
    public async Task<bool> IsContractOwnedByAsync(int contractId, Guid ownerId)
    {
        var contract = await _contractRepo.Query()
            .FirstOrDefaultAsync(c => c.Id == contractId);
        
        if (contract == null) return false; 

        return await IsRoomOwnedByAsync(contract.RoomId, ownerId);
    }
}