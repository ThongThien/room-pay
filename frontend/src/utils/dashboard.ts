import { OverdueInvoiceAPIResponse, OverdueInvoiceListItem } from '../types/dashboard';

// Hàm chuyển đổi chuỗi tiền tệ (VNĐ) sang số (đơn vị Triệu VNĐ) để tính toán
export const parseRevenueToNumber = (revenueStr: string): number => {
    // Loại bỏ ' ₫', dấu cách, dấu phẩy, và chuyển đổi thành số
    const cleanStr = revenueStr.replace(/[\s₫,]/g, '');
    const numberValue = parseFloat(cleanStr) / 1000000; // Chia cho 1 triệu để lấy đơn vị Triệu VNĐ
    return isNaN(numberValue) ? 0 : numberValue;
};

// Hàm tính số ngày quá hạn
export const calculateOverdueDays = (dueDateStr: string): number => {
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays); // Không trả về số âm
};

// Hàm format tiền tệ VNĐ
export const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString('vi-VN')} ₫`;
};

// Hàm map API response sang format frontend
export const mapOverdueInvoiceAPIResponse = (apiData: OverdueInvoiceAPIResponse[]): OverdueInvoiceListItem[] => {
    return apiData.map(invoice => ({
        id: invoice.id.toString(),
        tenantName: invoice.userName,
        roomNumber: "N/A", // API không trả về roomNumber, có thể cần update API hoặc lấy từ userId
        amount: formatCurrency(invoice.totalAmount),
        dueDate: new Date(invoice.dueDate).toLocaleDateString('vi-VN'),
        overdueDays: calculateOverdueDays(invoice.dueDate),
    }));
};

// Navigation helper (tạm thời)
export const useNavigate = () => (path: string) => alert(`Chuyển hướng đến: ${path}`);