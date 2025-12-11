const AA_API_URL = process.env.NEXT_PUBLIC_AA_API_URL;

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface UserInfo {
    id: string;
    fullName: string;
    email: string;
    ownerId?: string;
}

export const getCurrentUser = async (): Promise<UserInfo | null> => {
    try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            throw new Error("User ID not found in localStorage");
        }

        const res = await fetch(`${AA_API_URL}/Users/${userId}`, {
            method: 'GET',
            headers: {
                ...getAuthHeaders(),
                'X-Service-Api-Key': 'InternalService_SecretKey_2024_ChangeMeInProduction'
            },
        });

        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/public/login';
            }
            throw new Error("Không thể tải thông tin người dùng");
        }

        const data = await res.json();
        
        // Update localStorage with fresh data
        if (data.fullName) {
            localStorage.setItem("fullName", data.fullName);
        }
        
        return data;
    } catch (error) {
        console.error("Lỗi fetch user info:", error);
        return null;
    }
};