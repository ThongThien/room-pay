import React from 'react';
import { Invoice } from '@/types/invoice';
import { formatCurrency, formatDate, isOverdue } from '@/utils/payment';

interface InvoiceDetailsProps {
    invoice: Invoice;
    userName: string;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoice, userName }) => {
    const overdue = isOverdue(invoice.dueDate);

    return (
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
                    <span className={`font-semibold ${overdue ? 'text-red-500' : 'text-gray-800'}`}>
                        {formatDate(invoice.dueDate)}
                        {overdue && ' (Quá hạn)'}
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
                                    {formatCurrency(item.unitPrice)}
                                </td>
                                <td className="py-2 text-right font-semibold text-gray-800">
                                    {formatCurrency(item.amount)}
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
                        {formatCurrency(invoice.totalAmount)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetails;