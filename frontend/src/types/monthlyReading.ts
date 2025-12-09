// src/types/monthlyReading.ts

export interface MonthlyReading {
  id: number;
  cycleId: number;
  houseName?: string;
  roomName?: string;
  floor?: number;
  tenantName?: string;
  tenantContractId?: number;

  // Trạng thái: "Pending" | "Confirmed"
  status: string;


  electricOld: number;
  electricNew: number;
  electricPhotoUrl?: string;

  waterOld: number;
  waterNew: number;
  waterPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}