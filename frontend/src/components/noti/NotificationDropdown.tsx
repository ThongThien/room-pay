"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Notification, NotificationType } from "@/types/notification";
import { notificationService } from "@/services/notificationService";

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Hàm fetch data
    const fetchData = useCallback(async (currentUserId: string) => {
        if (!currentUserId) return;
        
        try {
            const [list, count] = await Promise.all([
                notificationService.getByUserId(currentUserId),
                notificationService.getUnreadCount(currentUserId)
            ]);
            
            // Sắp xếp mới nhất lên đầu
            const sortedList = list.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            
            setNotifications(sortedList);
            setUnreadCount(count);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, []);

    // EFFECT KHỞI TẠO
    useEffect(() => {
        const timer = setTimeout(() => {
            if (typeof window !== 'undefined') {
                const storedId = localStorage.getItem("userId");
                if (storedId) {
                    setUserId(storedId);
                    fetchData(storedId);
                }
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchData]);

    // EFFECT POLLING
    useEffect(() => {
        if (!userId) return;
        const interval = setInterval(() => {
            fetchData(userId);
        }, 60000);
        return () => clearInterval(interval);
    }, [userId, fetchData]);

    // Xử lý click ra ngoài
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Xử lý click vào 1 thông báo
    const handleNotificationClick = async (noti: Notification) => {
        if (!userId) return;
        if (!noti.isRead) {
            setNotifications(prev => prev.map(n => 
                n.id === noti.id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
            await notificationService.markAsRead(noti.id, userId);
        }
    };

    // Helper: Style màu sắc theo loại
    const getNotificationStyle = (type: NotificationType) => {
        switch (type) {
            case NotificationType.RemindPayment: // Quá hạn/Nhắc nợ -> Đỏ
                return "border-l-4 border-red-500 bg-red-50";
            case NotificationType.ReadingAnomaly: // Bất thường -> Tím
                return "border-l-4 border-purple-500 bg-purple-50";
            case NotificationType.RemindSubmission: // Nhắc nộp -> Vàng
                return "border-l-4 border-yellow-500 bg-yellow-50";
            case NotificationType.NewCycle: // Chu kỳ mới -> Xanh
            default:
                return "border-l-4 border-blue-500 bg-blue-50";
        }
    };

    // Format ngày giờ
    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            // Format gọn gàng: dd/mm/yyyy
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return "";
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Nút Chuông */}
            <button 
                onClick={() => { 
                    setIsOpen(!isOpen); 
                    if (!isOpen && userId) fetchData(userId); 
                }}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center focus:outline-none"
            >
                <Image src="/bell.svg" alt="noti" width={24} height={24} className="w-6 h-6" />
                
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white transform translate-x-1 -translate-y-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Content */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0">
                        <h3 className="font-bold text-gray-800">Thông báo</h3>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{unreadCount} chưa đọc</span>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                                <span className="text-4xl mb-2">📭</span>
                                <p className="text-sm">Bạn chưa có thông báo nào.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {notifications.map((item) => (
                                    <li 
                                        key={item.id} 
                                        onClick={() => handleNotificationClick(item)}
                                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${!item.isRead ? 'bg-white' : 'bg-gray-50/50'} ${getNotificationStyle(item.type)}`}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            {/* Thêm class 'truncate' để không xuống dòng */}
                                            <p className={`text-sm truncate w-full ${!item.isRead ? 'text-gray-900 font-bold' : 'text-gray-600'}`} title={item.message}>
                                                {item.message}
                                            </p>
                                            {!item.isRead && <span className="w-2 h-2 min-w-[8px] rounded-full bg-blue-600 mt-1.5 shadow-sm flex-shrink-0"></span>}
                                        </div>
                                        <span className="text-xs text-gray-400 mt-1 block text-right font-medium">
                                            {formatTime(item.createdAt)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="p-3 border-t bg-gray-50 text-center sticky bottom-0">
                        <button 
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            Đóng danh sách
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}