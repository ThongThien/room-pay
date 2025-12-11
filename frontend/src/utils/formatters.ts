export function mapStatusToVietnamese(status: string | number | null | undefined): string {
    if (status === null || status === undefined || status === "") return "Đang tải...";
    const statusString = typeof status === 'number' ? status.toString() : status.toLowerCase().trim();
    switch (statusString) {
        case "pending": case "0": return "Chờ xác nhận";
        case "approved": case "submitted": case "1": return "Đã xác nhận";
        default: return status.toString();
    }
}