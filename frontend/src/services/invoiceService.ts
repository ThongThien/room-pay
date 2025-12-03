import { Invoice } from "@/types/invoice";

const INV_API_URL = process.env.NEXT_PUBLIC_INVOICE_API_URL;

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const getMyInvoices = async (): Promise<Invoice[]> => {
    try {
        const res = await fetch(`${INV_API_URL}/Invoices`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!res.ok) {
            if (res.status === 401) {
                // Hết hạn token -> Reload hoặc đẩy về login
                window.location.href = '/public/login';
            }
            throw new Error("Không thể tải danh sách hóa đơn");
        }

        return await res.json();
    } catch (error) {
        console.error("Lỗi fetch invoice:", error);
        return [];
    }
};

export const getInvoiceDetail = async (id: number): Promise<Invoice | null> => {
    try {
        const res = await fetch(`${INV_API_URL}/Invoices/${id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error("Lỗi fetch detail:", error);
        return null;
    }
};
