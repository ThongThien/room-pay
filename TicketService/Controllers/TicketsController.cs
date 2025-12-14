using Microsoft.AspNetCore.Mvc;
using TicketService.Dtos;
using TicketService.Services;// Import Service

namespace TicketService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TicketsController : ControllerBase
    {
        // Khai báo Interface Service thay vì DbContext
        private readonly ITicketService _ticketService;

        public TicketsController(ITicketService ticketService)
        {
            _ticketService = ticketService;
        }

        // --- CHUNG CHO CẢ 2 (XEM LIST) ---
        [HttpGet]
        public async Task<IActionResult> GetTickets()
        {
            var tickets = await _ticketService.GetTicketsAsync();
            return Ok(tickets);
        }

        // --- PHẦN CỦA TENANT (TẠO VÉ) ---
        [HttpPost("create")]
        public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var newTicket = await _ticketService.CreateTicketAsync(dto);
            
            // Trả về object vừa tạo
            return Ok(new { message = "Tạo vé thành công", data = newTicket });
        }

        // --- PHẦN CỦA TENANT (SỬA VÉ CỦA MÌNH) ---
        [HttpPut("edit/{id}")]
        public async Task<IActionResult> EditTicket(int id, [FromBody] CreateTicketDto dto)
        {
            // Logic check TenantId có thể làm ở đây hoặc trong Service tùy bạn
            // Ở đây mình gọi Service xử lý data
            var isUpdated = await _ticketService.UpdateTicketContentAsync(id, dto);

            if (!isUpdated) return NotFound("Không tìm thấy vé hoặc vé không tồn tại.");

            return Ok("Đã cập nhật nội dung vé.");
        }

        // --- PHẦN CỦA OWNER (UPDATE STATUS) ---
        [HttpPatch("update-status/{id}")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTicketStatusDto dto)
        {
            var isUpdated = await _ticketService.UpdateTicketStatusAsync(id, dto);

            if (!isUpdated) return NotFound("Không tìm thấy vé.");

            return Ok("Cập nhật trạng thái thành công.");
        }

        // --- PHẦN CỦA OWNER (XÓA VÉ) ---
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTicket(int id)
        {
            var isDeleted = await _ticketService.DeleteTicketAsync(id);

            if (!isDeleted) return NotFound("Không tìm thấy vé để xóa.");

            return Ok("Đã xóa vé.");
        }
    }
}