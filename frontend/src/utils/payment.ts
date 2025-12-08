export const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('vi-VN') + ' ₫';
};

export const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
};

export const isOverdue = (dueDate: string | Date): boolean => {
    return new Date(dueDate) < new Date();
};