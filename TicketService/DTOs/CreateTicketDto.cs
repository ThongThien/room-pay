using System.ComponentModel.DataAnnotations;

namespace TicketService.Dtos
{
    public class CreateTicketDto
    {
        // Thêm 2 dòng này để sửa lỗi CS1061
        public int? TenantId { get; set; }
        public int? RoomId { get; set; }

        [Required(ErrorMessage = "Tiêu đề không được để trống")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mô tả không được để trống")]
        public string Description { get; set; } = string.Empty;
    }
}