"use client";

interface InvoiceStatsProps {
    stats: {
        totalCollected: number;
        totalPending: number;
    };
    countRemindable: number;
    isRemindingAll: boolean;
    onRemindAll: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function InvoiceStats({ stats, countRemindable, isRemindingAll, onRemindAll }: InvoiceStatsProps) {
    // Helper format tiền tệ
    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Thẻ Cần thu (Có chức năng nhắc nợ) */}
            <div 
                className={`bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex flex-col justify-between transition-colors relative overflow-hidden
                    ${countRemindable > 0 && !isRemindingAll ? "cursor-pointer hover:bg-orange-50" : "cursor-default opacity-90"}
                `}
                onClick={onRemindAll}
            >
                {/* Loading Overlay */}
                {isRemindingAll && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    </div>
                )}

                <div>
                    <p className="text-gray-500 text-xs uppercase font-semibold">Cần thu</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalPending)}</p>
                </div>
                <button 
                    className="mt-2 text-orange-600 text-xs font-semibold underline disabled:no-underline disabled:text-gray-400 text-left" 
                    disabled={countRemindable === 0 || isRemindingAll}
                >
                     {isRemindingAll 
                        ? "Đang gửi email..." 
                        : (countRemindable > 0 ? `Gửi nhắc thanh toán ${countRemindable} hóa đơn` : "Đã thu hết")
                    }
                </button>
            </div>

            {/* Thẻ Đã thu */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                <p className="text-gray-500 text-xs uppercase font-semibold">Đã thu</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</p>
            </div>

            {/* Thẻ Tổng dự kiến */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                <p className="text-gray-500 text-xs uppercase font-semibold">Tổng doanh thu dự kiến</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalCollected + stats.totalPending)}</p>
            </div>
        </div>
    );
}