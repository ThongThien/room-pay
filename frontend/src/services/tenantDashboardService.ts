import { API_URLS, getAuthHeaders } from "@/utils/config";
import { InvoiceItem } from "@/types/invoice";
import { getInvoiceDetail } from "@/services/invoiceService";

export interface ActiveContractData {
    houseName: string;
    roomNumber: string;
    contractEndDate: string;
    contractStatus: string;
    isExpiringSoon: boolean;
}

export interface UnpaidInvoiceItem {
    invoiceId: number;
    month: string;
    amount: number;
    dueDate: string;
    isOverdue: boolean;
    status: number;
    items: InvoiceItem[]; // Thêm chi tiết các khoản
}

export interface UnpaidInvoicesResponse {
    totalUnpaidAmount: number;
    unpaidInvoices: UnpaidInvoiceItem[];
}

export interface MissingReadingItem {
    monthYear: string;
    readingCycleId: number;
}

export interface MissingReadingsResponse {
    missingReadings: MissingReadingItem[];
    totalMissingMonths: number;
}

// Tổng hợp Dashboard Data
export interface TenantDashboardData {
    contract: ActiveContractData | null;
    invoices: UnpaidInvoicesResponse;
    readings: MissingReadingsResponse;
    // Fake data cho Incident
    openIncidents: number;
}

// Helper Format Tiền
export const formatVND = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

// Lazy load invoice details khi user click vào invoice
export const loadInvoiceDetails = async (invoiceId: number): Promise<InvoiceItem[]> => {
    try {
        const detail = await getInvoiceDetail(invoiceId);
        return detail?.items || [];
    } catch (error) {
        console.warn(`Failed to fetch details for invoice ${invoiceId}:`, error);
        return [];
    }
};

// --- API CALLS ---

export const getTenantDashboardData = async (): Promise<TenantDashboardData> => {
    const headers = getAuthHeaders();

    try {
        // Gọi song song 3 API theo đúng URL Leader cung cấp
        const [contractRes, invoiceRes, readingRes] = await Promise.all([
            // URL 1: Property Service
            fetch(`${API_URLS.PROPERTY}/tenant/contracts/active-info`, { headers }),

            // URL 2: Invoice Service
            fetch(`${API_URLS.INVOICE}/tenant/invoices/unpaid-invoices`, { headers }),

            // URL 3: Reading Service
            fetch(`${API_URLS.READING}/ReadingCycle/me/missing-readings`, { headers }),
        ]);

        // Xử lý Contract Data
        let contractData: ActiveContractData | null = null;
        if (contractRes.ok) {
            const json = await contractRes.json();
            // Nếu hết hạn trả về data: null
            contractData = json.data;
        } else {
            console.warn("Contract API Error:", contractRes.status);
        }

        // Xử lý Invoice Data - KHÔNG load chi tiết items ngay để tăng tốc
        let invoiceData: UnpaidInvoicesResponse = { totalUnpaidAmount: 0, unpaidInvoices: [] };
        if (invoiceRes.ok) {
            const json = await invoiceRes.json();
            if (json.success && json.data) {
                invoiceData = json.data;
                // Không fetch chi tiết items ở đây nữa - sẽ lazy load khi cần
            }
        } else {
            console.warn("Invoice API Error:", invoiceRes.status);
        }

        // 3. Xử lý Reading Data
        let readingData: MissingReadingsResponse = { missingReadings: [], totalMissingMonths: 0 };
        if (readingRes.ok) {
            const json = await readingRes.json();
            if (json.success && json.data) {
                readingData = json.data;
            }
        } else {
            console.warn("Reading API Error:", readingRes.status);
        }

        return {
            contract: contractData,
            invoices: invoiceData,
            readings: readingData,
            openIncidents: 3, // Fake số liệu sự cố
        };

    } catch (error) {
        console.error("Lỗi kết nối Dashboard:", error);
        // Trả về dữ liệu rỗng để UI không bị crash
        return {
            contract: null,
            invoices: { totalUnpaidAmount: 0, unpaidInvoices: [] },
            readings: { missingReadings: [], totalMissingMonths: 0 },
            openIncidents: 0
        };
    }
};
