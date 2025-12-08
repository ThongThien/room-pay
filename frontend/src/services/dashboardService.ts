import { getAuthHeaders } from '../utils/config';
import { INVOICE_API_URL, FAKE_PENDING_INVOICES, FAKE_ABNORMAL_READINGS, FAKE_NEAR_EXPIRY_CONTRACTS, FAKE_BUILDING_PERFORMANCE, FAKE_REVENUE_CHART_DATA } from '../constants/dashboard';
import { OwnerDashboardData, OverdueInvoiceAPIResponse, OverdueInvoiceListItem } from '../types/dashboard';
import { mapOverdueInvoiceAPIResponse } from '../utils/dashboard';

// Fetch dữ liệu dashboard chính
export const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
    const totalRooms = 400;
    const occupiedRooms = 360;
    const overdueAmountValue = 8_800_000;
    const pendingAmountValue = 10_020_000;

    // Fetch overdue invoices from API
    let overdueList: OverdueInvoiceListItem[] = [];
    try {
        const response = await fetch(`${INVOICE_API_URL}/invoices/status/overdue`, {
            headers: getAuthHeaders(),
        });
        if (response.ok) {
            const apiData: OverdueInvoiceAPIResponse[] = await response.json();
            overdueList = mapOverdueInvoiceAPIResponse(apiData);
        } else {
            console.warn('Failed to fetch overdue invoices, using fallback data');
            // Fallback data sẽ được set bên dưới
        }
    } catch (error) {
        console.error('Error fetching overdue invoices:', error);
        // Fallback data sẽ được set bên dưới
    }

    // Nếu không có data từ API, sử dụng fake data
    if (overdueList.length === 0) {
        overdueList = [
            { id: 'I001', tenantName: 'Nguyễn Văn A', roomNumber: 'A101', amount: '5,500,000 ₫', dueDate: '2025-11-20', overdueDays: 13 },
            { id: 'I002', tenantName: 'Lê Thị B', roomNumber: 'B205', amount: '3,300,000 ₫', dueDate: '2025-11-25', overdueDays: 8 },
        ];
    }

    return {
        // Dữ liệu Tổng quan
        totalRooms: totalRooms,
        occupiedRooms: occupiedRooms,
        annualTurnover: '12,500,000,000 ₫',
        pendingIncidents: 7,

        // Cảnh báo Count
        endContractsCount: FAKE_NEAR_EXPIRY_CONTRACTS.length,
        abnormalReadingCount: FAKE_ABNORMAL_READINGS.length,

        // Tài chính
        invoiceSummary: {
            totalAmount: '100,820,000 ₫',
            paidAmount: '82,000,000 ₫',
            currentUnpaidAmount: `${pendingAmountValue.toLocaleString('vi-VN')} ₫`,
            overdueAmount: `${overdueAmountValue.toLocaleString('vi-VN')} ₫`,
        },

        // Dữ liệu Chart và Bảng
        revenueChartData: FAKE_REVENUE_CHART_DATA,
        buildingPerformanceData: FAKE_BUILDING_PERFORMANCE,

        // DỮ LIỆU CHI TIẾT CHO MODAL
        overdueDetails: overdueList,
        pendingDetails: FAKE_PENDING_INVOICES,
        abnormalReadingDetails: FAKE_ABNORMAL_READINGS.map(item => ({
            ...item,
            type: item.type as 'Electricity' | 'Water'
        })),
        nearExpiryContractDetails: FAKE_NEAR_EXPIRY_CONTRACTS,
    };
};