using System.ComponentModel.DataAnnotations;

namespace TicketService.Dtos
{
    public class UpdateTicketStatusDto
    {
        [Required(ErrorMessage = "Trạng thái không được để trống")]
        // Nếu bạn dùng Enum cho Status thì đổi string thành tên Enum đó
        public string Status { get; set; } = string.Empty;
    }
}