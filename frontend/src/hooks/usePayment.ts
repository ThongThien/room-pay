import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice } from '@/types/invoice';
import { PaymentState, PaymentResponse } from '@/types/payment';
import { getInvoiceDetail } from '@/services/invoiceService';
import { getCurrentUser } from '@/services/userService';
import { createPaymentCheckout, getWebSocketUrl } from '@/services/paymentService';
import { PAYMENT_MESSAGES } from '@/constants/payment';

const initialState: PaymentState = {
    invoice: null,
    userName: '',
    loading: true,
    processing: false,
    error: null,
    paymentQR: null,
    orderId: null,
    paymentSuccess: false,
    wsConnection: null
};

export const usePayment = (invoiceId: string) => {
    const router = useRouter();
    const [state, setState] = useState<PaymentState>(initialState);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setState(prev => ({ ...prev, loading: true, error: null }));

                // Fetch user info
                const userInfo = await getCurrentUser();
                if (userInfo) {
                    setState(prev => ({ ...prev, userName: userInfo.fullName }));
                }

                // Fetch invoice
                const data: Invoice | null = await getInvoiceDetail(parseInt(invoiceId));

                if (!data) {
                    setState(prev => ({ ...prev, error: PAYMENT_MESSAGES.INVOICE_NOT_FOUND }));
                    return;
                }

                if (data.status === 'Paid') {
                    setState(prev => ({ ...prev, error: PAYMENT_MESSAGES.INVOICE_ALREADY_PAID }));
                    return;
                }

                setState(prev => ({ ...prev, invoice: data }));
            } catch (err) {
                setState(prev => ({
                    ...prev,
                    error: PAYMENT_MESSAGES.LOAD_ERROR,
                    loading: false
                }));
                console.error('Error fetching data:', err);
            } finally {
                setState(prev => ({ ...prev, loading: false }));
            }
        };

        if (invoiceId) {
            fetchData();
        }
    }, [invoiceId]);

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (state.wsConnection && state.wsConnection.readyState === WebSocket.OPEN) {
                console.log('Cleaning up WebSocket connection');
                state.wsConnection.close();
            }
        };
    }, [state.wsConnection]);

    const startPaymentStatusPolling = useCallback(() => {
        try {
            const wsUrl = getWebSocketUrl(invoiceId);
            console.log('WebSocket URL:', wsUrl);

            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('WebSocket connected for invoice:', invoiceId);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket message received:', data);

                    if (data.status === 'Paid' || data.invoiceStatus === 'Paid') {
                        setState(prev => ({ ...prev, paymentSuccess: true }));
                        ws.close();

                        // Redirect after 3 seconds
                        setTimeout(() => {
                            router.push('/tenant/dashboard');
                        }, 3000);
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setState(prev => ({ ...prev, error: PAYMENT_MESSAGES.WEBSOCKET_ERROR }));
            };

            ws.onclose = () => {
                console.log('WebSocket connection closed');
            };

            setState(prev => ({ ...prev, wsConnection: ws }));
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setState(prev => ({
                ...prev,
                error: err instanceof Error ? err.message : PAYMENT_MESSAGES.CONNECTION_ERROR
            }));
        }
    }, [invoiceId, router]);

    const handleCreatePayment = useCallback(async () => {
        if (!state.invoice) return;

        try {
            setState(prev => ({ ...prev, processing: true, error: null }));

            const paymentData = {
                invoiceId: state.invoice.id,
                amount: state.invoice.totalAmount,
                description: `Người thuê ${state.userName} thanh toán hóa đơn ${state.invoice.id}`,
                customData: {
                    userId: state.invoice.userId,
                    invoiceDate: state.invoice.invoiceDate
                }
            };

            console.log('Creating payment for invoice:', state.invoice.id);

            const data: PaymentResponse = await createPaymentCheckout(paymentData);
            console.log('Payment response:', data);

            if (data.success && data.qrCode) {
                setState(prev => ({
                    ...prev,
                    paymentQR: data.qrCode || null,
                    orderId: data.orderId || null
                }));

                // Start WebSocket polling
                startPaymentStatusPolling();
            } else {
                setState(prev => ({ ...prev, error: data.message || 'Không thể tạo thanh toán' }));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : PAYMENT_MESSAGES.PAYMENT_CREATION_ERROR;
            setState(prev => ({ ...prev, error: errorMessage }));
            console.error('Payment creation error:', err);
        } finally {
            setState(prev => ({ ...prev, processing: false }));
        }
    }, [state.invoice, state.userName, startPaymentStatusPolling]);

    return {
        ...state,
        handleCreatePayment
    };
};