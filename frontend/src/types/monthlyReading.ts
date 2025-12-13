export type ReadingStatus = "Pending" | "Confirmed" | "Overdue";
export interface MonthlyReading {
  id: number;
  cycleId: number;
  houseName?: string;
  roomName?: string;
  floor?: number;
  tenantName?: string;
  tenantContractId?: number;

  status: string | number;


  electricOld: number;
  electricNew: number;
  electricPhotoUrl?: string;

  waterOld: number;
  waterNew: number;
  waterPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}