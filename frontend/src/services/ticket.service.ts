import { CreateTicketDto, UpdateTicketStatusDto } from "@/types/ticket";

// LƯU Ý: Đổi cổng 5086 cho khớp với BE của bạn
const API_URL = "http://localhost:5086/api/Tickets"; 

export const ticketService = {
  // 1. Lấy danh sách
  getAll: async () => {
    const res = await fetch(`${API_URL}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch tickets");
    return res.json();
  },

  // 2. Tạo mới
  create: async (data: CreateTicketDto) => {
    const res = await fetch(`${API_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create ticket");
    return res.json();
  },

  // 3. Update nội dung
  updateContent: async (id: number, data: CreateTicketDto) => {
    const res = await fetch(`${API_URL}/edit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  },

  // 4. Update trạng thái
  updateStatus: async (id: number, status: string) => {
    const res = await fetch(`${API_URL}/update-status/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  },

  // 5. Xóa
  delete: async (id: number) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  }
};