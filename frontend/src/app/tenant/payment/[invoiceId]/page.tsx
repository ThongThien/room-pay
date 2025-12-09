"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePayment } from '@/hooks/usePayment';
import { PAYMENT_MESSAGES } from '@/constants/payment';
import { LoadingSpinner, ErrorDisplay, InvoiceDetails, PaymentSection } from '@/components/payment';

const PaymentPage: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.invoiceId as string;

    const {
        invoice,
        userName,
        loading,
        processing,
        error,
        paymentQR,
        orderId,
        paymentSuccess,
        handleCreatePayment
    } = usePayment(invoiceId);

    if (loading) {
        return <LoadingSpinner message={PAYMENT_MESSAGES.LOADING_INVOICE} />;
    }

    if (error || !invoice) {
        return <ErrorDisplay error={error || 'Unknown error'} />;
    }

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
                    <InvoiceDetails invoice={invoice} userName={userName} />

                    <PaymentSection
                        invoice={invoice}
                        processing={processing}
                        error={error}
                        paymentQR={paymentQR}
                        orderId={orderId}
                        paymentSuccess={paymentSuccess}
                        onCreatePayment={handleCreatePayment}
                    />
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
