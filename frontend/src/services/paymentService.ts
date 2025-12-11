import { PaymentResponse, PaymentData } from '@/types/payment';
import { PAYMENT_API_URL } from '@/constants/payment';

export const createPaymentCheckout = async (data: PaymentData): Promise<PaymentResponse> => {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${PAYMENT_API_URL}/Payment/create-checkout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Không thể tạo thanh toán (${response.status}): ${errorText}`);
    }

    return response.json();
};

export const getWebSocketUrl = (invoiceId: string): string => {
    const INVOICE_API_URL = process.env.NEXT_PUBLIC_INVOICE_API_URL;

    if (!INVOICE_API_URL) {
        throw new Error('Cấu hình API chưa đúng. Vui lòng liên hệ admin.');
    }

    try {
        const url = new URL(INVOICE_API_URL);
        const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
        const host = url.host;
        return `${wsProtocol}://${host}/ws/payment-status/${invoiceId}`;
    } catch {
        throw new Error('Không thể kết nối đến server. Vui lòng thử lại.');
    }
};