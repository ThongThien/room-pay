export interface Notification {
    id: number;
    message: string;
    type: NotificationType;
    isRead: boolean;
    createdAt: string;
}

// Map với Enum trong Backend (NotificationService/Models/Enums/NotificationType.cs)
export enum NotificationType {
    NewCycle = 0,       // Chu kỳ mới
    RemindSubmission = 1, // Nhắc nộp chỉ số
    RemindPayment = 2,    // Nhắc thanh toán
    ReadingAnomaly = 3    // Cảnh báo bất thường
}