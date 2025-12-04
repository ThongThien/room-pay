// Map theo Enum của Backend
export enum ContractStatus {
  Active = 0,
  Ended = 1,
}

export interface Contract {
  id: number;
  roomId: number;
  tenantId: string;
  startDate: string;
  endDate?: string;
  price: number;
  status: ContractStatus | number;
  fileUrl?: string;
  createdAt: string;
}

// Helper để lấy text hiển thị & màu sắc từ Status code
export const getStatusInfo = (status: number) => {
    switch (status) {
        case ContractStatus.Active:
            return { label: "Đang hiệu lực", color: "bg-green-100 text-green-700" };
        case ContractStatus.Ended:
            return { label: "Đã kết thúc", color: "bg-gray-200 text-gray-600" };
        default:
            return { label: "Không xác định", color: "bg-gray-100 text-gray-500" };
    }
};