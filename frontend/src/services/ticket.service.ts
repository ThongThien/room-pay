import { CreateTicketDto, Ticket } from "@/types/ticket";

// LƯU Ý: Đổi cổng 5086 cho khớp với BE của bạn
const API_URL = "http://localhost:5086/api/Tickets"; 

export const ticketService = {
  // 1. Lấy danh sách -> Trả về mảng Ticket
  getAll: async (): Promise<Ticket[]> => {
    const res = await fetch(`${API_URL}`, { 
      cache: "no-store",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch tickets: ${res.statusText}`);
    }
    return res.json();
  },

  // 2. Tạo mới -> Trả về 1 Ticket vừa tạo
  create: async (data: CreateTicketDto): Promise<Ticket> => {
    const res = await fetch(`${API_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error("Failed to create ticket");
    }
    return res.json();
  },

  // 3. Update nội dung -> Trả về boolean
  updateContent: async (id: number, data: CreateTicketDto): Promise<boolean> => {
    const res = await fetch(`${API_URL}/edit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  },

  // 4. Update trạng thái -> Trả về boolean
  updateStatus: async (id: number, status: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/update-status/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }), 
    });
    return res.ok;
  },

  // 5. Xóa -> Trả về boolean
  delete: async (id: number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  }
};