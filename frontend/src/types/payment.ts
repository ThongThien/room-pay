import { Invoice } from './invoice';

export interface PaymentResponse {
    success: boolean;
    message: string;
    checkoutUrl?: string;
    orderId?: string;
    qrCode?: string;
}

export interface PaymentState {
    invoice: Invoice | null;
    userName: string;
    loading: boolean;
    processing: boolean;
    error: string | null;
    paymentQR: string | null;
    orderId: string | null;
    paymentSuccess: boolean;
    wsConnection: WebSocket | null;
}

export interface PaymentData {
    invoiceId: number;
    amount: number;
    description: string;
    customData: {
        userId: string;
        invoiceDate: string;
    };
}