"use client";

import { Invoice } from "@/types/invoice";

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  // Tiền
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  // Ngày
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  // Kiểm tra trạng thái thanh toán
  const isPaid = invoice.status === "Paid";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[90vh] animate-slideIn">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h3 className="font-bold text-lg text-gray-800">Chi tiết Hóa đơn</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-black text-2xl font-light transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Content*/}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm text-gray-700 space-y-2 border border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500">Mã HĐ:</span>
            <span className="font-mono font-bold text-gray-900">#{invoice.id}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-500">Ngày tạo:</span>
            <span className="font-medium">{formatDate(invoice.invoiceDate)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Hạn thanh toán:</span>
            <span className="font-medium">{formatDate(invoice.dueDate)}</span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-gray-500">Trạng thái:</span>
            {isPaid ? (
              <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded text-xs border border-green-100 uppercase">
                Đã thanh toán
              </span>
            ) : (
               <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs border border-red-100">
                Chưa thanh toán
              </span>
            )}
          </div>
        </div>

        {/* Bảng chi tiết các khoản mục */}
        <div className="border rounded-lg overflow-hidden mb-6 flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
              <tr>
                <th className="p-3 text-left w-2/3">Khoản mục</th>
                <th className="p-3 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-700">
                    {item.description}
                    {item.productCode === 'ELECTRIC'}
                    {item.productCode === 'WATER'}
                  </td>
                  <td className="p-3 text-right font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tổng cộng */}
        <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-300 mb-6">
          <span className="font-bold text-gray-800 text-lg">Tổng cộng</span>
          <span className={`font-bold text-lg ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(invoice.totalAmount)}
          </span>
        </div>

        {/* Nút hành động (Chỉ hiện nếu chưa thanh toán) */}
        {!isPaid ? (
          <button className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md transition-all active:scale-95 text-sm uppercase tracking-wide">
            Thanh toán ngay
          </button>
        ) : (
           <button 
             onClick={onClose}
             className="w-full py-3 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-all text-sm"
            >
            Đóng
          </button>
        )}

      </div>
    </div>
  );
}
