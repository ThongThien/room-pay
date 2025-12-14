import { CreateTicketDto, Ticket } from "@/types/ticket";
import { API_URLS, getAuthHeaders } from "@/utils/config";

const API_URL = API_URLS.TICKET;

export const ticketService = {
  // 1. Lấy danh sách ticket của tenant hiện tại
  getMyTickets: async (): Promise<Ticket[]> => {
    const res = await fetch(`${API_URL}/ticket`, {
      cache: "no-store",
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/public/login';
        return [];
      }
      throw new Error(`Failed to fetch tickets: ${res.statusText}`);
    }
    return res.json();
  },

  // 2. Lấy danh sách ticket cho owner
  getAllTickets: async (): Promise<Ticket[]> => {
    const res = await fetch(`${API_URL}/ticket/owner`, {
      cache: "no-store",
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/public/login';
        return [];
      }
      throw new Error(`Failed to fetch tickets: ${res.statusText}`);
    }
    return res.json();
  },

  // 3. Tạo mới ticket
  create: async (data: CreateTicketDto): Promise<Ticket> => {
    const res = await fetch(`${API_URL}/ticket`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/public/login';
        return {} as Ticket;
      }
      throw new Error("Failed to create ticket");
    }
    return res.json();
  },

  // 4. Đóng ticket
  close: async (id: number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/ticket/${id}/close`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      window.location.href = '/public/login';
      return false;
    }
    return res.ok;
  },

  // 5. Chấp nhận ticket (cho owner)
  accept: async (id: number): Promise<boolean> => {
    const res = await fetch(`${API_URL}/ticket/${id}/accept`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      window.location.href = '/public/login';
      return false;
    }
    return res.ok;
  }
};