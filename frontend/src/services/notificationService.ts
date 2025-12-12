import { Notification } from "@/types/notification";

const API_URL = process.env.NEXT_PUBLIC_NOTIFICATION_API_URL + '/notifications';

export const notificationService = {
    // 1. Lấy danh sách thông báo của User
    getByUserId: async (userId: string): Promise<Notification[]> => {
        try {
            const res = await fetch(`${API_URL}/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Thêm Authorization header nếu cần
                }
            });
            if (!res.ok) throw new Error("Failed to fetch notifications");
            return await res.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    // 2. Đếm số lượng chưa đọc
    getUnreadCount: async (userId: string): Promise<number> => {
        try {
            const res = await fetch(`${API_URL}/unread-count/${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) return 0;
            const data = await res.json();
            return data.count || data.Count || 0;
        } catch {
            return 0;
        }
    },

    // 3. Đánh dấu đã đọc
    markAsRead: async (notificationId: number, userId: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/mark-as-read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId, userId })
            });
            return res.ok; // Trả về true nếu status 204 No Content
        } catch (error) {
            console.error(error);
            return false;
        }
    }
};