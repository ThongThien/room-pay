// src/services/invoiceService.ts

import { Invoice } from "@/types/invoice";
// 1. Import từ config
import { API_URLS, getAuthHeaders } from "@/utils/config";

// 2. Sử dụng API_URLS.INVOICE thay vì process.env
const BASE_URL = `${API_URLS.INVOICE}/invoices`;

export const getMyInvoices = async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    year?: number;
    month?: number;
}): Promise<Invoice[]> => {
    try {
        const queryParams = new URLSearchParams();
        
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params?.status) queryParams.append('status', params.status);
        if (params?.year) queryParams.append('year', params.year.toString());
        if (params?.month) queryParams.append('month', params.month.toString());

        const url = queryParams.toString() ? `${BASE_URL}?${queryParams.toString()}` : BASE_URL;
        
        const res = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/public/login';
                return [];
            }
            console.error(`Error ${res.status}: ${res.statusText}`);
            throw new Error("Không thể tải danh sách hóa đơn");
        }

        const invoices = await res.json();
        return invoices.map((invoice: Invoice) => ({
            ...invoice,
            items: []
        }));
    } catch (error) {
        console.error("Lỗi fetch invoice:", error);
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