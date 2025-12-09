import React from 'react';
import { Invoice } from '@/types/invoice';
import { PAYMENT_MESSAGES, PAYMENT_BUTTON_TEXT } from '@/constants/payment';
import { formatCurrency } from '@/utils/payment';
import SuccessDisplay from './SuccessDisplay';

interface PaymentSectionProps {
    invoice: Invoice;
    processing: boolean;
    error: string | null;
    paymentQR: string | null;
    orderId: string | null;
    paymentSuccess: boolean;
    onCreatePayment: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
    invoice,
    processing,
    error,
    paymentQR,
    orderId,
    paymentSuccess,
    onCreatePayment
}) => {
    if (paymentSuccess) {
        return <SuccessDisplay />;
    }

    return (
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
                                {PAYMENT_MESSAGES.PAYMENT_METHOD}
                            </p>
                        </div>
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Số tiền cần thanh toán:</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(invoice.totalAmount)}
                                </p>
                            </div>                        
                        <button
                            onClick={onCreatePayment}
                            disabled={processing}
                            className={`w-full py-3 rounded-lg font-bold text-white transition ${
                                processing
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        >
                            {processing ? PAYMENT_BUTTON_TEXT.PROCESSING : PAYMENT_BUTTON_TEXT.CREATE_QR}
                        </button>

                        <p className="text-xs text-gray-500 mt-3 text-center">
                            {PAYMENT_MESSAGES.PAYMENT_PROVIDER}
                        </p>
                    </div>
                ) : (
                    <div>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3 text-center">
                                {PAYMENT_MESSAGES.QR_SCAN_INSTRUCTION}
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
                                {PAYMENT_MESSAGES.PAYMENT_GUIDE_TITLE}
                            </p>
                            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                                {PAYMENT_MESSAGES.PAYMENT_GUIDE_STEPS.map((step, index) => (
                                    <li key={index}>{step}</li>
                                ))}
                            </ol>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-xs text-yellow-800 text-center">
                                {PAYMENT_MESSAGES.PAYMENT_WAITING}
                            </p>
                        </div>

                        {orderId && (
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Mã giao dịch: {orderId}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSection;