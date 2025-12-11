using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TicketService.Models
{
    public class Ticket
    {
        [Key]
        public int Id { get; set; }

        public int TenantId { get; set; }
        
        public int RoomId { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = "pending";

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        // public DateTime? UpdatedAt { get; set; }
    }
}