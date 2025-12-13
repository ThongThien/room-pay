"use client";

import { useEffect, useState, useMemo } from "react";
import { getMyInvoices, remindAllUnpaid } from "@/services/invoiceService";
import { Invoice, InvoiceApiParams } from "@/types/invoice";
import InvoiceDetailModal from "@/components/invoice/InvoiceDetailModal";
import InvoiceStats from "@/components/invoice/InvoiceStats";
import InvoiceFilters from "@/components/invoice/InvoiceFilters";
import InvoiceTable from "@/components/invoice/InvoiceTable";
import InvoicePagination from "@/components/invoice/InvoicePagination";
import ConfirmModal from "@/components/common/ConfirmModal"; 

export default function OwnerInvoicesPage() {
    // --- STATE QUẢN LÝ DỮ LIỆU ---
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalInvoices, setTotalInvoices] = useState(0);
    const pageSize = 20;

    // --- STATE BỘ LỌC ---
    const [statusFilter, setStatusFilter] = useState<"ALL" | "UNPAID" | "OVERDUE" | "PAID">("ALL");
    const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedHouseName, setSelectedHouseName] = useState<string>("ALL");

    // --- STATE UI KHÁC ---
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isRemindingAll, setIsRemindingAll] = useState(false);
    
    // Thêm state bật tắt Modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const params: InvoiceApiParams = { page: currentPage, pageSize };
                if (statusFilter !== "ALL") params.status = statusFilter;
                if (selectedYear) params.year = selectedYear;
                if (selectedMonth !== "ALL") params.month = selectedMonth;

                const data = await getMyInvoices(params);
                setInvoices(data);
                setTotalPages(Math.ceil(data.length / pageSize) || 1);
                setTotalInvoices(data.length);
            } catch (error) {
                console.error("Lỗi tải hóa đơn:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentPage, statusFilter, selectedMonth, selectedYear]);

    // --- DỮ LIỆU TÍNH TOÁN ---
    const uniqueHouses = useMemo(() => {
        const allHouseNames = invoices.map(inv => inv.houseName).filter((name): name is string => !!name);
        return Array.from(new Set(allHouseNames)).sort();
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            let matchStatus = true;
            if (statusFilter === "UNPAID") matchStatus = inv.status === "Unpaid";
            if (statusFilter === "OVERDUE") matchStatus = inv.status === "Overdue";
            if (statusFilter === "PAID") matchStatus = inv.status === "Paid";

            const invDate = new Date(inv.invoiceDate);
            const matchYear = invDate.getFullYear() === selectedYear;
            const matchMonth = selectedMonth === "ALL" || (invDate.getMonth() + 1) === selectedMonth;
            const matchHouse = selectedHouseName === "ALL" || inv.houseName === selectedHouseName;

            return matchStatus && matchYear && matchMonth && matchHouse;
        });
    }, [invoices, statusFilter, selectedYear, selectedMonth, selectedHouseName]);

    const stats = useMemo(() => ({
        totalCollected: filteredInvoices.filter(i => i.status === "Paid").reduce((acc, cur) => acc + cur.totalAmount, 0),
        totalPending: filteredInvoices.filter(i => i.status !== "Paid").reduce((acc, cur) => acc + cur.totalAmount, 0),
        countUnpaid: filteredInvoices.filter(i => i.status === "Unpaid").length,
        countOverdue: filteredInvoices.filter(i => i.status === "Overdue").length,
    }), [filteredInvoices]);

    const countRemindable = stats.countUnpaid + stats.countOverdue;

    // --- HANDLERS ---

    // Hàm 1: Chỉ dùng để mở Modal khi người dùng click vào thẻ "Cần thu"
    const openRemindModal = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (countRemindable === 0 || isRemindingAll) return;
        setShowConfirmModal(true); // Mở Modal
    }

    // Hàm 2: Thực thi logic gọi API (Được gọi khi bấm "Đồng ý" trong Modal)
    const executeRemindAll = async () => {
        try {
            setIsRemindingAll(true); // Bật loading trên Modal
            
            const success = await remindAllUnpaid();
            
            // Tắt Modal trước khi hiện alert
            setShowConfirmModal(false);

            if (success) {
                alert(`Đã gửi lệnh nhắc nợ thành công đến hệ thống.`);
            } else {
                alert("Có lỗi xảy ra khi gửi lệnh nhắc nợ. Vui lòng thử lại.");
            }
        } catch (error) {
            console.error(error);
            setShowConfirmModal(false);
            alert("Lỗi kết nối.");
        } finally {
            setIsRemindingAll(false);
        }
    }


    return (
        <div className="space-y-6 p-6 bg-gray-50 min-h-screen text-gray-800">
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Quản lý hóa đơn</h2>
                    <p className="text-gray-500 text-sm">Hóa đơn tháng {selectedMonth === "ALL" ? "Tất cả" : selectedMonth}/{selectedYear}</p>
                </div>

                <InvoiceStats 
                    stats={stats} 
                    countRemindable={countRemindable} 
                    isRemindingAll={isRemindingAll} 
                    onRemindAll={openRemindModal} // Gọi hàm mở Modal
                />
            </div>

            <InvoiceFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                selectedHouseName={selectedHouseName}
                setSelectedHouseName={setSelectedHouseName}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                uniqueHouses={uniqueHouses}
                onFilterChange={() => setCurrentPage(1)}
            />

            <InvoiceTable 
                invoices={filteredInvoices} 
                loading={loading} 
                onSelectInvoice={setSelectedInvoice} 
            />

            <InvoicePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalInvoices={totalInvoices}
                pageSize={pageSize}
                loading={loading}
                onPageChange={setCurrentPage}
            />

            {selectedInvoice && (
                <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} role="Owner" />
            )}

            {/* 3. Render Modal xác nhận */}
            <ConfirmModal 
                isOpen={showConfirmModal}
                onClose={() => !isRemindingAll && setShowConfirmModal(false)} // Không cho đóng khi đang loading
                onConfirm={executeRemindAll}
                title="Xác nhận nhắc thanh toán"
                message={`Gửi nhắc nhở thanh toán đến ${countRemindable} khách thuê?`}
                isLoading={isRemindingAll}
                confirmText="Gửi thông báo"
                cancelText="Quay lại"
            />
        </div>
    );
}