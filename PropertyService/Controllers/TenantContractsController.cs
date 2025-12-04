// Code này cho trang dashboard tenant
using Microsoft.AspNetCore.Mvc;
using PropertyService.DTOs.Contracts;
using PropertyService.Services.Interfaces;
using System.Net;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PropertyService.Controllers
{
    [ApiController]
    [Route("api/tenant/contracts")] 
    [Authorize(Roles = "Tenant")]
    public class TenantContractsController : ControllerBase
    {
        private readonly IContractService _contractService;

        // ⭐ CONSTRUCTOR
        public TenantContractsController(IContractService contractService)
        {
            _contractService = contractService;
        }

        // --- HELPER: Lấy Tenant ID từ JWT ---
        private Guid GetUserIdGuid() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException("User ID not found in token."));

        // --- 1. GET ACTIVE CONTRACT INFO (Dashboard Mục 1, 2, 3) ---
        [HttpGet("active-info")] 
        [ProducesResponseType(typeof(ContractDto), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public async Task<IActionResult> GetActiveContractInfo()
        {
            Guid tenantId;
            try
            {
                tenantId = GetUserIdGuid();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            
            // 1. Gọi Service để lấy Hợp đồng đang hoạt động
            var contract = await _contractService.GetActiveContractByTenantIdAsync(tenantId);

            if (contract == null)
            {
                // Trả về 200 OK với data = null để Frontend dễ xử lý nếu không có Hợp đồng
                return Ok(new { success = true, message = "No active contract found.", data = (object?)null });
            }

            // 2. Tính toán trạng thái Sắp hết hạn (Mục 3)
            var endDate = contract.EndDate;
            bool isExpiringSoon = false;
            // Bắt đầu với trạng thái gốc từ Service
            string contractStatus = contract.Status.ToString();

            if (endDate.HasValue)
            {
                // Chuyển DateOnly sang DateTime để tính toán
                var daysRemaining = (endDate.Value.ToDateTime(TimeOnly.MinValue) - DateTime.Today).Days;

                if (daysRemaining <= 30 && daysRemaining > 0)
                {
                    isExpiringSoon = true;
                    contractStatus = "Sắp hết hạn"; // Ghi đè trạng thái hiển thị
                }
                else if (daysRemaining <= 0)
                {
                    contractStatus = "Đã hết hạn";
                }
                else
                {
                    contractStatus = "Còn hiệu lực";
                }
            }
            
            // 3. Trả về DTO tổng hợp
            return Ok(new
            {
                success = true,
                message = "Active contract details retrieved successfully.",
                data = new 
                {
                    HouseName = contract.HouseName,
                    RoomNumber = contract.RoomNumber,
                    ContractEndDate = contract.EndDate, 
                    // Sử dụng cú pháp rút gọn cho biến cục bộ
                    contractStatus,     
                    isExpiringSoon      
                }
            });
        }
        
        // --- 2. GET MY CONTRACTS (Lấy danh sách cho trang quản lý Hợp đồng) ---
        [HttpGet] // GET api/tenant/contracts
        [ProducesResponseType(typeof(IEnumerable<ContractDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public async Task<IActionResult> GetMyContracts()
        {
            try
            {
                Guid tenantId = GetUserIdGuid(); 
                
                var contracts = await _contractService.GetContractsByTenantIdAsync(tenantId);

                return Ok(new { success = true, data = contracts });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception)
            {
                // Log lỗi nếu cần thiết
                return StatusCode(500, new { success = false, message = "Internal server error." });
            }
        }
    }
}