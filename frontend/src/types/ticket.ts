export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: number; // 0: Pending, 1: InProgress, 2: Done
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  contractId: number;
  houseName?: string;
  roomName?: string;
  tenantName?: string;
}

export interface CreateTicketDto {
  title: string;
  description: string;
}

export interface UpdateTicketStatusDto {
  status: string;
}