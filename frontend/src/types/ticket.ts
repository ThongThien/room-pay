export interface Ticket {
  id: number;
  tenantId: string;
  roomId: number;
  title: string;
  description: string;
  status: string; // "pending" | "processing" | "done"
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTicketDto {
  tenantId: string;
  roomId: number;
  title: string;
  description: string;
}

export interface UpdateTicketStatusDto {
  status: string;
}