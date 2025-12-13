// src/services/readingService.ts
import { API_URLS, getAuthHeaders } from "@/utils/config"; // Giả sử bạn lưu file config ở đây

export const readingService = {
    getCycles: async () => {
        // Sử dụng getAuthHeaders() thay vì viết tay
        const res = await fetch(`${API_URLS.READING}/ReadingCycle`, { headers: getAuthHeaders() });
        return res.json();
    },

    getReadingByCycle: async (cycleId: number) => {
        const res = await fetch(`${API_URLS.READING}/MonthlyReading/by-cycle/${cycleId}`, { headers: getAuthHeaders() });
        if (res.status === 404) return null;
        return res.json();
    },

    getPresignedUrl: async (photoUrl: string | null | undefined) => {
        if (!photoUrl) return "";
        try {
            const u = new URL(photoUrl);
            const key = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
            const resp = await fetch(`${API_URLS.READING}/MonthlyReading/image-proxy?key=${encodeURIComponent(key)}`);
            if (!resp.ok) return "";
            const json = await resp.json();
            return json.url || "";
        } catch { return ""; }
    },

    // --- LƯU Ý QUAN TRỌNG Ở ĐÂY ---
    uploadImage: async (type: "electric" | "water", file: File) => {
        const form = new FormData();
        form.append("file", file);
        
        // 1. Lấy headers mặc định (có chứa Authorization và Content-Type: json)
        const headers = getAuthHeaders();
        // 2. XÓA Content-Type để trình duyệt tự động set multipart/form-data cho file
        delete headers["Content-Type"];

        const res = await fetch(`${API_URLS.IMAGE}/${type}/upload`, { 
            method: "POST", 
            headers: headers, // Truyền headers đã xóa Content-Type
            body: form 
        });
        return res.json();
    },

    submitReadings: async (cycleId: number, formData: FormData) => {
        // Tương tự, vì gửi FormData nên phải xóa Content-Type json đi
        const headers = getAuthHeaders();
        delete headers["Content-Type"];

        const res = await fetch(`${API_URLS.READING}/MonthlyReading/${cycleId}/submit`, {
            method: "POST",
            headers: headers,
            body: formData
        });
        return res;
    },

    createInvoice: async (data: { cycleId: number; electricUsage: number; waterUsage: number }) => {
        // Hàm này gửi JSON nên dùng getAuthHeaders() bình thường
        const res = await fetch(`${API_URLS.INVOICE}/invoices`, {
            method: "POST",
            headers: getAuthHeaders(), 
            body: JSON.stringify(data)
        });
        return res;
    }
};