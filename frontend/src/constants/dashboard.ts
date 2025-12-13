// Constants cho Owner Dashboard
export const INVOICE_API_URL = process.env.NEXT_PUBLIC_INVOICE_API_URL;
export const PROPERTY_API_URL = process.env.NEXT_PUBLIC_PROPERTY_API_URL;
export const READING_API_URL = process.env.NEXT_PUBLIC_READING_API_URL;
export const PENDING_INVOICES_API_URL = `${INVOICE_API_URL}/invoices/pending-this-month`;

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
    ABNORMAL_ELECTRIC: '/MonthlyReading/abnormal-electric?threshold=150',
    ABNORMAL_WATER: '/MonthlyReading/abnormal-water?threshold=10',
};