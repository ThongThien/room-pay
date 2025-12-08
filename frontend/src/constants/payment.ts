export const PAYMENT_API_URL = process.env.NEXT_PUBLIC_PAYMENT_API_URL;
export const INVOICE_API_URL = process.env.NEXT_PUBLIC_INVOICE_API_URL;

export const PAYMENT_MESSAGES = {
    LOADING_INVOICE: 'Đang tải thông tin hóa đơn...',
    INVOICE_NOT_FOUND: 'Không tìm thấy hóa đơn',
    INVOICE_ALREADY_PAID: 'Hóa đơn này đã được thanh toán',
    LOAD_ERROR: 'Không thể tải thông tin',
    PAYMENT_CREATION_ERROR: 'Đã xảy ra lỗi khi tạo thanh toán',
    PAYMENT_SUCCESS: 'Thanh toán thành công!',
    REDIRECTING: 'Đang chuyển về trang chủ...',
    WEBSOCKET_ERROR: 'Lỗi kết nối WebSocket. Vui lòng refresh trang.',
    API_CONFIG_ERROR: 'Cấu hình API chưa đúng. Vui lòng liên hệ admin.',
    CONNECTION_ERROR: 'Không thể kết nối đến server. Vui lòng thử lại.',
    QR_SCAN_INSTRUCTION: 'Quét mã QR để thanh toán',
    PAYMENT_METHOD: '💳 Thanh toán qua Chuyển khoản ngân hàng',
    PAYMENT_PROVIDER: 'Hệ thống sử dụng cổng thanh toán SePay',
    PAYMENT_WAITING: '⏱️ Đang chờ xác nhận thanh toán...',
    PAYMENT_GUIDE_TITLE: '✓ Hướng dẫn thanh toán:',
    PAYMENT_GUIDE_STEPS: [
        'Mở ứng dụng ngân hàng',
        'Quét mã QR bên trên',
        'Kiểm tra thông tin và xác nhận',
        'Hệ thống tự động cập nhật'
    ]
} as const;

export const PAYMENT_BUTTON_TEXT = {
    PROCESSING: 'Đang xử lý...',
    CREATE_QR: 'Tạo QR thanh toán'
} as const;