// Types cho Owner Dashboard
export interface OverdueInvoiceListItem {
    id: string;
    tenantName: string;
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
}

export interface NearExpiryContractListItem {
    id: string;
    tenantName: string;
    roomNumber: string;
    houseName: string;
    endDate: string;
    remainingDays: number;
}

export interface RevenueDataPoint {
    month: string;
    paidAmount: number; // Đã thanh toán (Triệu)
    pendingAmount: number; // Chờ thanh toán (chưa quá hạn - Triệu)
    overdueAmount: number; // Quá hạn (Overdue - Triệu)
}

export interface BuildingPerformance {
    buildingId: string;
    buildingName: string;
    totalRooms: number;
    vacantRooms: number;
    occupiedRooms: number;
    occupancyRate: string;
    currentMonthRevenue: string; // Chuỗi tiền tệ
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
    revenueChartData: RevenueDataPoint[];
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
    apiEndpoint: string;
    color: 'green' | 'red' | 'yellow' | 'default';
    onClick?: () => void;
    isClickable?: boolean;
}

export interface RevenueChartProps {
    data: OwnerDashboardData['revenueChartData'];
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