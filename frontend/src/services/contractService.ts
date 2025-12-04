import { Contract } from "@/types/contract";

const PROP_API_URL = process.env.NEXT_PUBLIC_PROPERTY_API_URL;

const getAuthHeaders = (): Record<string, string> => {
    // Giá trị mặc định luôn có Content-Type
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Kiểm tra môi trường browser
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        // Chỉ thêm Authorization nếu token tồn tại và không rỗng
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};

export const getMyContracts = async (): Promise<Contract[]> => {
    try {
        const res = await fetch(`${PROP_API_URL}/Contracts/my-contracts`, {
            method: 'GET',
            headers: getAuthHeaders(), 
        });

        if (!res.ok) {
            if (res.status === 401) {
                 if (typeof window !== "undefined") window.location.href = '/public/login';
            }
            throw new Error("Không thể tải danh sách hợp đồng");
        }

        const json = await res.json();
        // API Backend trả về { success: true, data: [...] }
        return json.data || [];
        
    } catch (error) {
        console.error("Lỗi fetch contracts:", error);
        return [];
    }
};

export const getContractDetail = async (id: number): Promise<Contract | null> => {
    try {
        const res = await fetch(`${PROP_API_URL}/Contracts/${id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!res.ok) return null;
        
        const json = await res.json();
        return json.data || null;
    } catch (error) {
        console.error("Lỗi fetch contract detail:", error);
        return null;
    }
};