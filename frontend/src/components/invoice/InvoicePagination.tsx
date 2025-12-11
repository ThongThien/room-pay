"use client";

interface InvoicePaginationProps {
    currentPage: number;
    totalPages: number;
    totalInvoices: number;
    pageSize: number;
    loading: boolean;
    onPageChange: (page: number) => void;
}

export default function InvoicePagination({ currentPage, totalPages, totalInvoices, pageSize, loading, onPageChange }: InvoicePaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-700">
                <span>Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalInvoices)} của {totalInvoices} hóa đơn</span>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Trước
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;

                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            disabled={loading}
                            className={`px-3 py-1 text-sm border rounded-md ${currentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Sau
                </button>
            </div>
        </div>
    );
}