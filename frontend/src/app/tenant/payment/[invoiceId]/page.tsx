"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInvoiceDetail } from '@/services/invoiceService';
import { getCurrentUser } from '@/services/userTenantService';
import { Invoice } from '@/types/invoice';

const PAYMENT_API_URL = process.env.NEXT_PUBLIC_PAYMENT_API_URL;
const INVOICE_API_URL = process.env.NEXT_PUBLIC_INVOICE_API_URL;

interface PaymentResponse {
    success: boolean;
    message: string;
    checkoutUrl?: string;
    orderId?: string;
    qrCode?: string;
}

const PaymentPage: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.invoiceId as string;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentQR, setPaymentQR] = useState<string | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch user info from database
                const userInfo = await getCurrentUser();
                if (userInfo) {
                    setUserName(userInfo.fullName);
                }

                // Fetch invoice
                const data = await getInvoiceDetail(parseInt(invoiceId));
                
                if (!data) {
                    setError('Không tìm thấy hóa đơn');
                    return;
                }

                if (data.status === 'Paid') {
                    setError('Hóa đơn này đã được thanh toán');
                    return;
                }

                setInvoice(data);
            } catch (err) {
                setError('Không thể tải thông tin');
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (invoiceId) {
            fetchData();
        }
    }, [invoiceId]);

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                console.log('Cleaning up WebSocket connection');
                wsConnection.close();
            }
        };
    }, [wsConnection]);

    const handleCreatePayment = async () => {
        if (!invoice) return;

        try {
            setProcessing(true);
            setError(null);

            const token = localStorage.getItem('accessToken');
            
            console.log('Creating payment for invoice:', invoice.id);
            console.log('Payment API URL:', PAYMENT_API_URL);
            
            const response = await fetch(`${PAYMENT_API_URL}/Payment/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    amount: invoice.totalAmount,
                    description: `Người thuê ${userName} thanh toán hóa đơn ${invoice.id}`,
                    customData: {
                        userId: invoice.userId,
                        invoiceDate: invoice.invoiceDate
                    }
                })
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Payment API error:', errorText);
                throw new Error(`Không thể tạo thanh toán (${response.status}): ${errorText}`);
            }

            const data: PaymentResponse = await response.json();
            console.log('Payment response:', data);

            if (data.success && data.qrCode) {
                setPaymentQR(data.qrCode);
                setOrderId(data.orderId || null);
                
                // Bắt đầu polling để check payment status
                startPaymentStatusPolling();
            } else {
                setError(data.message || 'Không thể tạo thanh toán');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo thanh toán';
            setError(errorMessage);
            console.error('Payment creation error:', err);
        } finally {
            setProcessing(false);
        }
    };

    const startPaymentStatusPolling = () => {
        // Use WebSocket for real-time payment status updates
        const getWebSocketUrl = () => {
            if (!INVOICE_API_URL) {
                console.error('INVOICE_API_URL is not defined');
                throw new Error('Cấu hình API chưa đúng. Vui lòng liên hệ admin.');
            }

            try {
                const url = new URL(INVOICE_API_URL);
                const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
                const host = url.host;
                const wsUrl = `${wsProtocol}://${host}/ws/payment-status/${invoiceId}`;
                
                console.log('WebSocket URL:', wsUrl);
                return wsUrl;
            } catch (err) {
                console.error('Invalid INVOICE_API_URL:', INVOICE_API_URL, err);
                throw new Error('Không thể kết nối đến server. Vui lòng thử lại.');
            }
        };
        
        let ws: WebSocket;
        try {
            ws = new WebSocket(getWebSocketUrl());
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setError(err instanceof Error ? err.message : 'Không thể kết nối WebSocket');
            return;
        }
        
        ws.onopen = () => {
            console.log('WebSocket connected for invoice:', invoiceId);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data);
                
                if (data.status === 'Paid' || data.invoiceStatus === 'Paid') {
                    // Payment successful
                    setPaymentSuccess(true);
                    ws.close();
                    
                    // Redirect after 2 seconds
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
            setError('Lỗi kết nối WebSocket. Vui lòng refresh trang.');
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        setWsConnection(ws);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang tải thông tin hóa đơn...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Lỗi</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/tenant/dashboard')}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                    >
                        Quay về Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const dueDate = new Date(invoice.dueDate);
    const isOverdue = dueDate < new Date();

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/tenant/dashboard')}
                        className="text-blue-500 hover:text-blue-600 flex items-center mb-4"
                    >
                        ← Quay lại Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Thanh toán hóa đơn</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Invoice Details */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                            Chi tiết hóa đơn
                        </h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Mã hóa đơn:</span>
                                <span className="font-semibold text-gray-800">INV-{invoice.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Người thuê:</span>
                                <span className="font-semibold text-gray-800">{userName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Hạn thanh toán:</span>
                                <span className={`font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-800'}`}>
                                    {dueDate.toLocaleDateString('vi-VN')}
                                    {isOverdue && ' (Quá hạn)'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Trạng thái:</span>
                                <span className={`font-semibold ${
                                    invoice.status === 'Paid' ? 'text-green-600' : 'text-orange-500'
                                }`}>
                                    {invoice.status === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                </span>
                            </div>
                        </div>

                        {/* Invoice Items */}
                        <h3 className="font-semibold text-gray-800 mb-3">Chi tiết các khoản:</h3>
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 text-gray-600 text-sm">Mô tả</th>
                                        <th className="text-right py-2 text-gray-600 text-sm">Số lượng</th>
                                        <th className="text-right py-2 text-gray-600 text-sm">Đơn giá</th>
                                        <th className="text-right py-2 text-gray-600 text-sm">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item) => (
                                        <tr key={item.id} className="border-b last:border-b-0">
                                            <td className="py-2 text-gray-800">{item.description}</td>
                                            <td className="py-2 text-right text-gray-800">{item.quantity}</td>
                                            <td className="py-2 text-right text-gray-800">
                                                {item.unitPrice.toLocaleString('vi-VN')} ₫
                                            </td>
                                            <td className="py-2 text-right font-semibold text-gray-800">
                                                {item.amount.toLocaleString('vi-VN')} ₫
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total Amount */}
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-800">Tổng cộng:</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    {invoice.totalAmount.toLocaleString('vi-VN')} ₫
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                Phương thức thanh toán
                            </h2>

                            {!paymentQR ? (
                                <div>
                                    {error && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-red-800 font-semibold">⚠️ Lỗi</p>
                                            <p className="text-xs text-red-600 mt-1">{error}</p>
                                        </div>
                                    )}
                                    
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-blue-800">
                                            💳 Thanh toán qua Chuyển khoản ngân hàng
                                        </p>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600 mb-2">Số tiền cần thanh toán:</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {invoice.totalAmount.toLocaleString('vi-VN')} ₫
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleCreatePayment}
                                        disabled={processing}
                                        className={`w-full py-3 rounded-lg font-bold text-white transition ${
                                            processing
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-500 hover:bg-blue-600'
                                        }`}
                                    >
                                        {processing ? 'Đang xử lý...' : 'Tạo QR thanh toán'}
                                    </button>

                                    <p className="text-xs text-gray-500 mt-3 text-center">
                                        Hệ thống sử dụng cổng thanh toán SePay
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {paymentSuccess ? (
                                        <div className="text-center py-8">
                                            {/* success circle image icon */}
                                            <div className="mb-4 flex justify-center">
                                                <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center">
                                                    <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-bold text-green-600 mb-2">
                                                Thanh toán thành công!
                                            </h3>
                                            <p className="text-gray-600 mb-4">
                                                Đang chuyển về trang chủ...
                                            </p>
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-4">
                                                <p className="text-sm text-gray-600 mb-3 text-center">
                                                    Quét mã QR để thanh toán
                                                </p>
                                                <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={paymentQR}
                                                        alt="QR Code"
                                                        className="w-full max-w-xs mx-auto"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                                <p className="text-sm text-green-800 font-semibold mb-2">
                                                    ✓ Hướng dẫn thanh toán:
                                                </p>
                                                <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                                                    <li>Mở ứng dụng ngân hàng</li>
                                                    <li>Quét mã QR bên trên</li>
                                                    <li>Kiểm tra thông tin và xác nhận</li>
                                                    <li>Hệ thống tự động cập nhật</li>
                                                </ol>
                                            </div>

                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                <p className="text-xs text-yellow-800 text-center">
                                                    ⏱️ Đang chờ xác nhận thanh toán...
                                                </p>
                                            </div>

                                            {orderId && (
                                                <p className="text-xs text-gray-500 mt-2 text-center">
                                                    Mã giao dịch: {orderId}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
