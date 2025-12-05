// src/services/invoiceService.ts

import { Invoice } from "@/types/invoice";
// 1. Import từ config
import { API_URLS, getAuthHeaders } from "@/utils/config";

// 2. Sử dụng API_URLS.INVOICE thay vì process.env
const BASE_URL = `${API_URLS.INVOICE}/Invoices`;

export const getMyInvoices = async (): Promise<Invoice[]> => {
    try {
        const res = await fetch(BASE_URL, {
            method: 'GET',
            headers: getAuthHeaders(), // 3. Sử dụng helper từ config
        });

        if (!res.ok) {
            if (res.status === 401) {
                // Xử lý hết hạn token
                window.location.href = '/public/login';
                return [];
            }
            // Log status text để debug dễ hơn
            console.error(`Error ${res.status}: ${res.statusText}`);
            throw new Error("Không thể tải danh sách hóa đơn");
        }

        return await res.json();
    } catch (error) {
        console.error("Lỗi fetch invoice:", error);
        // Trả về mảng rỗng thay vì throw để UI không bị crash trắng trang
        return [];
    }
};

export const getInvoiceDetail = async (id: number): Promise<Invoice | null> => {
    try {
        const res = await fetch(`${BASE_URL}/${id}`, {
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

export const markInvoiceAsPaid = async (id: number): Promise<boolean> => {
    try {
        const res = await fetch(`${BASE_URL}/${id}/mark-paid`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });

        if (!res.ok) return false;
        return true;
    } catch (error) {
        console.error("Lỗi mark paid:", error);
        return false;
    }
};