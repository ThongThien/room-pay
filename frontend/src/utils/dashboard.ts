import { OverdueInvoiceAPIResponse, OverdueInvoiceListItem } from '../types/dashboard';

// Hàm chuyển đổi chuỗi tiền tệ (VNĐ) sang số (đơn vị Triệu VNĐ) để tính toán
export const parseRevenueToNumber = (revenueStr: string): number => {
    // Loại bỏ ' ₫', dấu cách, dấu phẩy, và chuyển đổi thành số
    const cleanStr = revenueStr.replace(/[\s₫,]/g, '');
    const numberValue = parseFloat(cleanStr) / 1000000; // Chia cho 1 triệu để lấy đơn vị Triệu VNĐ
    return isNaN(numberValue) ? 0 : numberValue;
};

// Hàm tính số ngày quá hạn
export const calculateOverdueDays = (dueDateStr: string, status?: string): number => {
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return status === 'Overdue' ? Math.max(0, diffDays) : 0;
};

// Hàm format tiền tệ VNĐ
export const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString('vi-VN')} đ`;
};

// Hàm format tiền tệ theo đơn vị Triệu VNĐ
export const formatCurrencyInMillions = (amount: number | string): string => {
    // Nếu amount là string, parse thành number
    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[\s₫,]/g, '')) : amount;

    // Chia cho 1 triệu và làm tròn đến 3 chữ số thập phân
    const millionAmount = numAmount / 1000000;

    // Format với dấu phẩy và thêm đơn vị
    return `${millionAmount.toLocaleString('vi-VN')} triệu đồng`;
};

// Hàm map API response sang format frontend
export const mapOverdueInvoiceAPIResponse = (apiData: OverdueInvoiceAPIResponse[]): OverdueInvoiceListItem[] => {
    return apiData.map(invoice => ({
        id: invoice.id.toString(),
        tenantName: invoice.userName,
        houseName: invoice.houseName || "N/A",
        roomNumber: invoice.roomName || "N/A",
        amount: formatCurrency(invoice.totalAmount),
        dueDate: new Date(invoice.dueDate).toLocaleDateString('vi-VN'),
        overdueDays: calculateOverdueDays(invoice.dueDate, invoice.status),
    }));
};

// Navigation helper (tạm thời)
export const useNavigate = () => (path: string) => alert(`Chuyển hướng đến: ${path}`);

// Hàm tính số ngày còn lại đến hết hạn hợp đồng
export const calculateRemainingDays = (endDateStr: string): number => {
    const endDate = new Date(endDateStr);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays); // Không trả về số âm
};