using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PropertyService.DTOs.Contracts;
using PropertyService.Models;
using PropertyService.Models.Enums;
using PropertyService.Repositories;
using PropertyService.Services.Clients;
using PropertyService.Services.Interfaces;
using Microsoft.Extensions.Logging;
namespace PropertyService.Services;

public class ContractService : IContractService
{
    private readonly IGenericRepository<TenantContracts> _contractRepo;
    private readonly IRoomService _roomService; 
    private readonly IHouseService _houseService;
    private readonly IUserServiceClient _userService;
    private readonly IMapper _mapper;
    private readonly ILogger<ContractService> _logger;

    public ContractService(
        IGenericRepository<TenantContracts> contractRepo,
        IRoomService roomService,
        IHouseService houseService,
        IUserServiceClient userService,
        IMapper mapper,
        ILogger<ContractService> logger)
    {
        _contractRepo = contractRepo;
        _roomService = roomService;
        _houseService = houseService;
        _userService = userService;
        _mapper = mapper;
        _logger = logger;
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
    
    //  GET ALL CONTRACTS BY OWNER ID
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
    
    //  GET BY ID (Dùng cho Controller check quyền)
    public async Task<ContractDto?> GetByIdAsync(int contractId, Guid ownerId)
    {
        // Controller đã kiểm tra quyền sở hữu, ta chỉ cần lấy Contract
        var contract = await _contractRepo.GetByIdAsync(contractId);
        
        if (contract == null) return null;
        
        // Kiểm tra lại quyền sở hữu một lần nữa nếu cần (Mặc định: Controller đã lo)
        if (!await IsContractOwnedByAsync(contractId, ownerId)) return null;

        return _mapper.Map<ContractDto>(contract);
    }
    
    //  UPDATE CONTRACT
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
    
    //  DELETE CONTRACT
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
    //  TRIỂN KHAI PHƯƠNG THỨC CŨ (ĐỂ KHỚP VỚI IContractService của bạn)
    // =================================================================

    // Triển khai phương thức cũ cho ContractController.GetContract(int id)
    public async Task<ContractDto?> GetContractByIdAsync(int id)
    {
        var contract = await _contractRepo.Query()
            .Include(c => c.Room)
            .ThenInclude(r => r.House)
            .FirstOrDefaultAsync(c => c.Id == id);
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
        // DEBUG 3: KIỂM TRA REPOSITORY INJECTION 
        // Đặt Breakpoint ở đây và kiểm tra xem _contractRepo có bị NULL không.
        if (_contractRepo == null)
        {
            _logger.LogError("FATAL ERROR: _contractRepo is NULL (Dependency Injection Failure).");
            // Throw lỗi để Controller bắt và trả về 500
            throw new InvalidOperationException("Contract Repository is not initialized.");
        }
        
        string tenantIdString = tenantId.ToString();

        // Use simple query to eliminate Null Reference error from JOIN
        var contractsWithDetails = await _contractRepo.Query()
            .Where(c => c.TenantId == tenantIdString)
            
            // Query only direct fields from Contract table
            .Select(c => new ContractDto
            {
                Id = c.Id,
                RoomId = c.RoomId,
                TenantId = c.TenantId,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                Price = c.Price,
                Status = c.Status,
                FileUrl = c.FileUrl,
                CreatedAt = c.CreatedAt,
                
                // Ensure not to access c.Room or c.Room.House here
            })
            .ToListAsync();

        //  DEBUG 4: KIỂM TRA KẾT QUẢ TRUY VẤN 
        _logger.LogInformation("Successfully retrieved {Count} contracts for tenant {TenantId}", 
                            contractsWithDetails.Count, tenantId);

        return contractsWithDetails;
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
    //  LOGIC KIỂM TRA QUYỀN SỞ HỮU
    // =================================================================
    
    //  KIỂM TRA QUYỀN SỞ HỮU ROOM
    public async Task<bool> IsRoomOwnedByAsync(int roomId, Guid ownerId)
    {
        var houseId = await _roomService.GetHouseIdByRoomIdAsync(roomId);
        
        if (houseId == null) return false; 

        return await _houseService.IsOwnedByAsync(houseId.Value, ownerId);
    }

    //  KIỂM TRA QUYỀN SỞ HỮU CONTRACT
    public async Task<bool> IsContractOwnedByAsync(int contractId, Guid ownerId)
    {
        var contract = await _contractRepo.Query()
            .FirstOrDefaultAsync(c => c.Id == contractId);
        
        if (contract == null) return false; 

        return await IsRoomOwnedByAsync(contract.RoomId, ownerId);
    }
    // PropertyService/Services/Implementations/ContractService.cs

    public async Task<ContractDto?> GetActiveContractByTenantIdAsync(string tenantId)
    {
        string tenantIdString = tenantId.ToString();
        // Lấy ngày hiện tại dưới dạng DateOnly
        var today = DateOnly.FromDateTime(DateTime.Today); 
        
        var activeContract = await _contractRepo.Query()
            .Where(c => c.TenantId == tenantIdString)
            //  LỌC HỢP ĐỒNG ĐANG HOẠT ĐỘNG
            // Giả định ContractStatus.ACTIVE là trạng thái hợp lệ.
            .Where(c => c.Status == ContractStatus.Active && 
                        (c.EndDate == null || c.EndDate >= today))
            
            //  PROJECTION AND JOIN (Done in previous step)
            .Select(c => new ContractDto
            {
                Id = c.Id,
                RoomId = c.RoomId,
                TenantId = c.TenantId,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                Price = c.Price,
                Status = c.Status,
                FileUrl = c.FileUrl,
                CreatedAt = c.CreatedAt,
                
                // Lấy thông tin JOIN từ Rooms và Houses
                HouseName = c.Room!.House!.Name, 
                RoomName = c.Room!.Name 
            })
            .FirstOrDefaultAsync(); // Lấy 1 bản ghi duy nhất

        return activeContract;
    }

    /// <summary>
    /// Get contracts expiring within specified days threshold for a specific owner
    /// </summary>
    public async Task<IEnumerable<ContractDto>> GetExpiringContractsAsync(Guid ownerId, int daysThreshold = 30)
    {
        // Lấy tất cả houses thuộc owner
        var houses = await _houseService.GetHousesOwnedByAsync(ownerId);
        var houseIds = houses.Select(h => h.Id).ToList();

        // Tính toán ngày threshold
        var today = DateOnly.FromDateTime(DateTime.Today);
        var thresholdDate = today.AddDays(daysThreshold);

        // Lấy các contracts sắp hết hạn (chưa parse TenantId)
        var expiringContracts = await _contractRepo.Query()
            .Include(c => c.Room)
            .ThenInclude(r => r.House)
            .Where(c => c.Room != null && houseIds.Contains(c.Room!.HouseId))
            .Where(c => c.Status == ContractStatus.Active) // Chỉ lấy hợp đồng đang active
            .Where(c => c.EndDate != null && c.EndDate >= today && c.EndDate <= thresholdDate)
            .OrderBy(c => c.EndDate)
            .ToListAsync();

        // Fetch tenant names
        var tenantIds = expiringContracts.Select(c => c.TenantId).Distinct().ToList();
        var tenantTasks = tenantIds.Select(id => _userService.GetUserByIdAsync(id)).ToList();
        var tenantResults = await Task.WhenAll(tenantTasks);
        var tenantDict = tenantIds.Zip(tenantResults, (id, user) => new { id, user })
            .ToDictionary(x => x.id, x => x.user?.TryGetValue("fullName", out var name) == true ? name?.ToString() ?? "Unknown" : "Unknown");

        _logger.LogInformation("Fetched tenant names: {@TenantDict}", tenantDict);

        // Map sang DTO sau khi đã load từ database
        return expiringContracts.Select(c => new ContractDto
        {
            Id = c.Id,
            RoomId = c.RoomId,
            TenantId = c.TenantId,
            TenantName = tenantDict.TryGetValue(c.TenantId, out var name) ? name : "Unknown",
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            Price = c.Price,
            Status = c.Status,
            FileUrl = c.FileUrl,
            CreatedAt = c.CreatedAt,
            HouseName = c.Room!.House!.Name ?? string.Empty,
            RoomName = c.Room!.Name ?? string.Empty
        }).ToList();
    }

    public async Task<PropertyDetailsDto?> GetPropertyDetailsByContractIdAsync(int contractId)
    {
        // Giả định _contractRepo.Query() trả về IQueryable<TenantContracts>
        var result = await _contractRepo.Query()
            .Where(c => c.Id == contractId)
            .Include(c => c.Room)
                .ThenInclude(r => r.House)
            .Select(c => new PropertyDetailsDto
            {
                ContractId = c.Id,
                HouseName = c.Room.House.Name,
                RoomName = c.Room.Name, // Giả định c.Room.Name là RoomName
                Floor = c.Room.Floor // Giả định Room có thuộc tính Floor (int)
            })
            .FirstOrDefaultAsync();

        return result;
    }

    public async Task<IEnumerable<PropertyDetailsDto>> GetPropertyDetailsByContractIdsAsync(IEnumerable<int> contractIds)
    {
        if (contractIds == null || !contractIds.Any())
        {
            return Enumerable.Empty<PropertyDetailsDto>();
        }

        var results = await _contractRepo.Query()
            .Where(c => contractIds.Contains(c.Id))
            .Include(c => c.Room)
                .ThenInclude(r => r.House)
            .Select(c => new PropertyDetailsDto
            {
                ContractId = c.Id,
                HouseName = c.Room!.House!.Name,
                RoomName = c.Room!.Name, 
                Floor = c.Room!.Floor 
            })
            .ToListAsync();

        return results;
    }
}