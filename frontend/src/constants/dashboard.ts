// Constants cho Owner Dashboard
export const INVOICE_API_URL = process.env.NEXT_PUBLIC_INVOICE_API_URL;
export const PENDING_INVOICES_API_URL = `${INVOICE_API_URL}/invoices/pending-this-month`;

// Fake data cho development
export const FAKE_PENDING_INVOICES: import('../types/dashboard').PendingInvoiceListItem[] = [
    { id: 'P001', tenantName: 'Trần Văn C', roomNumber: 'C301', amount: '4,000,000 ₫', invoiceDate: '2025-12-01' },
    { id: 'P002', tenantName: 'Phạm Thị D', roomNumber: 'D402', amount: '6,020,000 ₫', invoiceDate: '2025-12-15' },
];

export const FAKE_ABNORMAL_READINGS: import('../types/dashboard').AbnormalReadingListItem[] = [
    { id: 'R001', tenantName: 'Hoàng Văn E', roomNumber: 'A201', houseName: 'Tòa A', type: 'Electricity', increasePercent: 55 },
    { id: 'R002', tenantName: 'Đỗ Thị G', roomNumber: 'C305', houseName: 'Tòa C', type: 'Water', increasePercent: 40 },
    { id: 'R003', tenantName: 'Mai Văn H', roomNumber: 'B102', houseName: 'Tòa B', type: 'Electricity', increasePercent: 35 },
];

export const FAKE_NEAR_EXPIRY_CONTRACTS: import('../types/dashboard').NearExpiryContractListItem[] = [
    { id: 'C001', tenantName: 'Vũ Văn I', roomNumber: 'A102', houseName: 'Tòa A', endDate: '2026-01-01', remainingDays: 29 },
    { id: 'C002', tenantName: 'Bùi Thị K', roomNumber: 'C405', houseName: 'Tòa C', endDate: '2026-01-15', remainingDays: 15 },
];

export const FAKE_BUILDING_PERFORMANCE: import('../types/dashboard').BuildingPerformance[] = [
    { buildingId: 'B01', buildingName: 'Tòa A - Sông Hàn', totalRooms: 150, occupiedRooms: 135, vacantRooms: 15, occupancyRate: '90%', currentMonthRevenue: '450,000,000 ₫' },
    { buildingId: 'B02', buildingName: 'Tòa B - Bến Nghé', totalRooms: 200, occupiedRooms: 180, vacantRooms: 20, occupancyRate: '90%', currentMonthRevenue: '400,000,000 ₫' },
    { buildingId: 'B03', buildingName: 'Tòa C - Phố Cổ', totalRooms: 50, occupiedRooms: 45, vacantRooms: 5, occupancyRate: '90%', currentMonthRevenue: '150,000,000 ₫' },
];

export const FAKE_REVENUE_CHART_DATA: import('../types/dashboard').RevenueDataPoint[] = [
    { month: '09/25', paidAmount: 15, pendingAmount: 3, overdueAmount: 2 },
    { month: '10/25', paidAmount: 25, pendingAmount: 4, overdueAmount: 1 },
    { month: '11/25', paidAmount: 40, pendingAmount: 5, overdueAmount: 5 },
    { month: '12/25', paidAmount: 35, pendingAmount: 8, overdueAmount: 0 },
];

// Chart colors
export const PIE_CHART_COLORS = {
    ROOM_OCCUPANCY: ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981'],
    REVENUE: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'],
};

// Modal types
export type ModalType = 'overdue' | 'pending' | 'abnormal' | 'contract' | null;

// API Endpoints
export const API_ENDPOINTS = {
    OVERDUE_INVOICES: '/invoices/status/overdue',
    REVENUE_CHART: '/api/v1/invoice/chart/monthly-status',
    ROOM_OCCUPANCY: '/api/v1/property/summary/rooms-occupancy-by-house',
    REVENUE_BY_BUILDING: '/api/v1/finance/summary/revenue-by-house',
    BUILDING_PERFORMANCE: '/api/v1/property/performance-by-building-list',
    INVOICE_SUMMARY_OVERDUE: '/api/v1/invoice/summary/overdue-amount',
    INVOICE_SUMMARY_PENDING: '/api/v1/invoice/summary/current-pending',
    TICKET_SUMMARY: '/api/v1/ticket/owner/summary',
    CONTRACT_WARNING: '/api/v1/contract/warning/ending-count',
    UTILITY_WARNING: '/api/v1/utility-reading/warning/abnormal-count',
};