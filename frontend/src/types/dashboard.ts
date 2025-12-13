// Types cho Owner Dashboard
export interface OverdueInvoiceListItem {
    id: string;
    tenantName: string;
    houseName: string;
    roomNumber: string;
    amount: string;
    dueDate: string;
    overdueDays: number;
}

export interface PendingInvoiceListItem {
    id: string;
    tenantName: string;
    roomNumber: string;
    amount: string;
    invoiceDate: string;
}

export interface AbnormalReadingListItem {
    id: string;
    tenantName: string;
    roomNumber: string;
    houseName: string;
    type: 'Electricity' | 'Water';
    increasePercent: number;
    increaseAmount: number;
}

export interface NearExpiryContractListItem {
    id: string;
    tenantName: string;
    roomNumber: string;
    houseName: string;
    endDate: string;
    remainingDays: number;
}

export interface MonthlyRevenueDataPoint {
    monthYear: string;     
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
}

export interface BuildingPerformance {
    buildingId: string;
    buildingName: string;
    totalRooms: number;
    vacantRooms: number;
    occupiedRooms: number;
    occupancyRate: string;
    currentMonthRevenue: string; // Chuỗi tiền tệ
    rawRevenue: number;
}

export interface OwnerDashboardData {
    // Dữ liệu Tổng quan
    totalRooms: number;
    occupiedRooms: number;
    annualTurnover: string; // Tổng thu 1 năm
    pendingIncidents: number;

    // Cảnh báo Count
    endContractsCount: number;
    abnormalReadingCount: number;

    // Tài chính
    invoiceSummary: {
        totalAmount: string;
        paidAmount: string;
        currentUnpaidAmount: string;
        overdueAmount: string;
    };

    // Dữ liệu Chart và Bảng
    revenueChartData: MonthlyRevenueDataPoint[];
    buildingPerformanceData: BuildingPerformance[];

    // Thêm các trường details để Modal truy cập
    overdueDetails: OverdueInvoiceListItem[];
    pendingDetails: PendingInvoiceListItem[];
    abnormalReadingDetails: AbnormalReadingListItem[];
    nearExpiryContractDetails: NearExpiryContractListItem[];
}

// API Response Types
export interface OverdueInvoiceAPIResponse {
    id: number;
    userId: string;
    userName: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    status: string;
    paidDate: string | null;
    createdAt: string;
    updatedAt: string;
    tenantContractId: number;
    houseName: string;
    roomName: string;
    floor: number;
    items: Array<{
        id: number;
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
        productCode: string;
    }>;
}

// Component Props Types
export interface ModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export interface DashboardCardProps {
    title: string;
    value: string;
    color: 'green' | 'red' | 'yellow' | 'default';
    onClick?: () => void;
    isClickable?: boolean;
}

export interface RevenueChartProps {
    data: MonthlyRevenueDataPoint[];
    annualTurnover: string;
}

export interface OccupancyChartProps {
    occupied: number;
    vacant: number;
}

export interface DataTableProps<T = Record<string, unknown>> {
    title: string;
    columns: Array<{
        key: string;
        header: string;
        render?: (value: unknown, row: T) => React.ReactNode;
    }>;
    data: T[];
    onRowClick?: (row: T) => void;
}

// API Response interfaces
export interface ContractAPIResponse {
    id: number;
    roomId: number;
    tenantName: string;
    startDate: string;
    endDate: string;
    price: number;
    status: number;
    fileUrl: string;
    createdAt: string;
    houseName: string;
    roomNumber: string;
}

export interface NearExpiryContractListItem {
    id: string;
    tenantName: string;
    houseName: string;
    roomNumber: string;
    endDate: string;
    remainingDays: number;
}

export interface AbnormalReadingAPIResponse {
    id: number;
    cycleId: number;
    electricOld: number;
    electricNew: number;
    electricPhotoUrl: string;
    waterOld: number;
    waterNew: number;
    waterPhotoUrl: string;
    status: number;
    createdAt: string;
    updatedAt: string;
    tenantContractId: number;
    houseName: string;
    roomName: string;
    floor: number;
    tenantName: string;
    tenantId: string;
}