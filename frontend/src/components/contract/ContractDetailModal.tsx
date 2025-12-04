"use client";

import { Contract, getStatusInfo } from "@/types/contract";

interface ContractDetailModalProps {
  contract: Contract;
  onClose: () => void;
}

export default function ContractDetailModal({ contract, onClose }: ContractDetailModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if(!dateString) return "---";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const statusInfo = getStatusInfo(contract.status as number);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-slideIn relative">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl font-light"
        >
          &times;
        </button>

        <h3 className="font-bold text-xl text-gray-800 mb-6 border-b pb-2">Chi tiết Hợp đồng thuê</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Thông tin cơ bản */}
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 block text-xs uppercase font-bold">Mã hợp đồng</label>
              <span className="font-mono font-medium">#{contract.id}</span>
            </div>
            <div>
              <label className="text-gray-500 block text-xs uppercase font-bold">Phòng thuê</label>
              <span className="font-medium text-lg text-blue-600">
                 Phòng số {contract.roomId}
              </span>
            </div>
            <div>
              <label className="text-gray-500 block text-xs uppercase font-bold">Trạng thái</label>
              <span className={`px-2 py-1 rounded text-xs font-bold inline-block mt-1 ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Thời hạn & Giá */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-500 block text-xs uppercase font-bold">Ngày bắt đầu</label>
                <span className="font-medium">{formatDate(contract.startDate)}</span>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase font-bold">Ngày kết thúc</label>
                <span className="font-medium">{formatDate(contract.endDate)}</span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-dashed">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Giá thuê (tháng):</span>
                <span className="font-bold text-gray-900">{formatCurrency(contract.price)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Nút tải hợp đồng nếu có FileUrl */}
        {contract.fileUrl && (
             <div className="mt-4">
                 <a href={contract.fileUrl} target="_blank" className="text-blue-600 hover:underline text-sm">
                     📄 Tải file hợp đồng gốc
                 </a>
             </div>
        )}

        <div className="mt-6 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
           >
             Đóng
           </button>
        </div>
      </div>
    </div>
  );
}