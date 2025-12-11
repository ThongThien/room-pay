import { getAuthHeaders } from '../utils/config';
import { INVOICE_API_URL, FAKE_PENDING_INVOICES, FAKE_ABNORMAL_READINGS, FAKE_NEAR_EXPIRY_CONTRACTS, FAKE_BUILDING_PERFORMANCE, FAKE_REVENUE_CHART_DATA, PENDING_INVOICES_API_URL, PROPERTY_API_URL } from '../constants/dashboard';
import { OwnerDashboardData, OverdueInvoiceAPIResponse, OverdueInvoiceListItem, ContractAPIResponse } from '../types/dashboard';
import { mapOverdueInvoiceAPIResponse, formatCurrencyInMillions, calculateRemainingDays } from '../utils/dashboard';

// Hàm tính tổng tiền hóa đơn quá hạn
const calculateTotalOverdueAmount = (overdueInvoices: OverdueInvoiceListItem[]): number => {
    if (!overdueInvoices || overdueInvoices.length === 0) {
        console.log('No overdue invoices to calculate');
        return 0;
    }

    let total = 0;
    let validInvoices = 0;

    for (const invoice of overdueInvoices) {
        try {
            // Validate invoice data
            if (!invoice.amount || typeof invoice.amount !== 'string') {
                console.warn(`Invalid amount for invoice ${invoice.id}:`, invoice.amount);
                continue;
            }

            // Parse amount string to number (remove ' ₫', commas, and dots)
            const amountStr = invoice.amount.replace(/[\s₫,.\u00A0]/g, '');
            const amountNum = parseFloat(amountStr);

            // Validate parsed number
            if (isNaN(amountNum) || amountNum < 0) {
                console.warn(`Invalid parsed amount for invoice ${invoice.id}: "${invoice.amount}" -> ${amountNum}`);
                continue;
            }

            total += amountNum;
            validInvoices++;

            // Log để debug (chỉ log một vài invoice đầu)
            if (validInvoices <= 3) {
                console.log(`Invoice ${invoice.id}: "${invoice.amount}" -> ${amountNum} VND`);
            }

        } catch (error) {
            console.error(`Error processing invoice ${invoice.id}:`, error);
            continue;
        }
    }

    console.log(`Processed ${validInvoices}/${overdueInvoices.length} valid overdue invoices`);
    console.log(`Total overdue amount: ${total} VND`);

    return total;
};

// Hàm tính tổng tiền hóa đơn pending
const calculateTotalPendingAmount = (pendingInvoices: import('../types/dashboard').PendingInvoiceListItem[]): number => {
    if (!pendingInvoices || pendingInvoices.length === 0) {
        console.log('No pending invoices to calculate');
        return 0;
    }

    let total = 0;
    let validInvoices = 0;

    for (const invoice of pendingInvoices) {
        try {
            // Validate invoice data
            if (!invoice.amount || typeof invoice.amount !== 'string') {
                console.warn(`Invalid amount for invoice ${invoice.id}:`, invoice.amount);
                continue;
            }

            // Parse amount string to number (remove ' ₫', commas, and dots)
            const amountStr = invoice.amount.replace(/[\s₫,.\u00A0]/g, '');
            const amountNum = parseFloat(amountStr);

            // Validate parsed number
            if (isNaN(amountNum) || amountNum < 0) {
                console.warn(`Invalid parsed amount for invoice ${invoice.id}: "${invoice.amount}" -> ${amountNum}`);
                continue;
            }

            total += amountNum;
            validInvoices++;

        } catch (error) {
            console.error(`Error processing invoice ${invoice.id}:`, error);
            continue;
        }
    }

    console.log(`Processed ${validInvoices}/${pendingInvoices.length} valid pending invoices`);
    console.log(`Total pending amount: ${total} VND`);

    return total;
};

// Hàm fetch pending invoices từ API
const fetchPendingInvoices = async (): Promise<import('../types/dashboard').PendingInvoiceListItem[]> => {
    try {
        const response = await fetch(PENDING_INVOICES_API_URL, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            console.warn('Failed to fetch pending invoices, using fake data');
            return FAKE_PENDING_INVOICES;
        }

        const data = await response.json();
        console.log('Fetched pending invoices:', data);

        // Map API response to frontend format
        return data.map((invoice: { id: number; tenantName: string; roomName: string; amount: number; invoiceDate: string }) => ({
            id: invoice.id.toString(),
            tenantName: invoice.tenantName,
            roomNumber: invoice.roomName, // API returns roomName, frontend expects roomNumber
            amount: `${invoice.amount.toLocaleString()} ₫`,
            invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString('vi-VN'),
        }));
    } catch (error) {
        console.error('Error fetching pending invoices:', error);
        return FAKE_PENDING_INVOICES;
    }
};

// Hàm fetch near expiry contracts từ API
const fetchNearExpiryContracts = async (): Promise<import('../types/dashboard').NearExpiryContractListItem[]> => {
    try {
        const response = await fetch(`${PROPERTY_API_URL}/contracts/expiring`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            console.warn('Failed to fetch near expiry contracts, using fake data');
            return FAKE_NEAR_EXPIRY_CONTRACTS.map(item => ({
                ...item,
                remainingDays: calculateRemainingDays(item.endDate)
            }));
        }

        const apiResponse = await response.json();
        console.log('Fetched near expiry contracts:', apiResponse);

        // Map API response to frontend format
        return apiResponse.data.map((contract: ContractAPIResponse) => ({
            id: contract.id.toString(),
            tenantName: contract.tenantName,
            houseName: contract.houseName,
            roomNumber: contract.roomNumber,
            endDate: new Date(contract.endDate).toLocaleDateString('vi-VN'),
            remainingDays: calculateRemainingDays(contract.endDate),
        }));
    } catch (error) {
        console.error('Error fetching near expiry contracts:', error);
        return FAKE_NEAR_EXPIRY_CONTRACTS.map(item => ({
            ...item,
            remainingDays: calculateRemainingDays(item.endDate)
        }));
    }
};

// Fetch dữ liệu dashboard chính
export const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
    const totalRooms = 400;
    const occupiedRooms = 360;

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

    // Tính tổng tiền quá hạn từ overdueList
    const calculatedOverdueAmount = calculateTotalOverdueAmount(overdueList);

    // Log tổng tiền quá hạn để debug
    console.log(`Total overdue amount: ${calculatedOverdueAmount} VND`);

    // Fetch pending invoices
    const pendingList = await fetchPendingInvoices();
    const calculatedPendingAmount = calculateTotalPendingAmount(pendingList);

    console.log(`Total pending amount: ${calculatedPendingAmount} VND`);

    // Fetch near expiry contracts
    const nearExpiryList = await fetchNearExpiryContracts();

    return {
        // Dữ liệu Tổng quan
        totalRooms: totalRooms,
        occupiedRooms: occupiedRooms,
        annualTurnover: '12,500,000,000 ₫',
        pendingIncidents: 7,

        // Cảnh báo Count
        endContractsCount: nearExpiryList.length,
        abnormalReadingCount: FAKE_ABNORMAL_READINGS.length,

        // Tài chính
        invoiceSummary: {
            totalAmount: '100,820,000 ₫',
            paidAmount: '82,000,000 ₫',
            currentUnpaidAmount: formatCurrencyInMillions(calculatedPendingAmount),
            overdueAmount: formatCurrencyInMillions(calculatedOverdueAmount),
        },

        // Dữ liệu Chart và Bảng
        revenueChartData: FAKE_REVENUE_CHART_DATA,
        buildingPerformanceData: FAKE_BUILDING_PERFORMANCE,

        // DỮ LIỆU CHI TIẾT CHO MODAL
        overdueDetails: overdueList,
        pendingDetails: pendingList,
        abnormalReadingDetails: FAKE_ABNORMAL_READINGS.map(item => ({
            ...item,
            type: item.type as 'Electricity' | 'Water'
        })),
        nearExpiryContractDetails: nearExpiryList,
    };
};