export interface Ticket {
  id: number;
  tenantId: number;
  roomId: number;
  title: string;
  description: string;
  status: string; // "pending" | "processing" | "done"
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTicketDto {
  tenantId: number;
  roomId: number;
  title: string;
  description: string;
}

export interface UpdateTicketStatusDto {
  status: string;
}