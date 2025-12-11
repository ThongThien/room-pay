"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MonthlyReading, ReadingStatus } from "@/types/monthlyReading";
import { getAllMonthlyReadings } from "@/services/monthlyReadingService";
import UtilityReadingDetailModal from "@/components/monthlyReading/UtilityReadingDetailModal";
import ReadingStats from "@/components/monthlyReading/ReadingStats";
import ReadingFilterBar from "@/components/monthlyReading/ReadingFilterBar";
import ReadingTable from "@/components/monthlyReading/ReadingTable";

export default function OwnerUtilitiesPage() {
  const [readings, setReadings] = useState<MonthlyReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReadingStatus>("ALL");

  // State thời gian
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [selectedHouseName, setSelectedHouseName] = useState<string>("ALL");
  const [selectedReading, setSelectedReading] = useState<MonthlyReading | null>(null);

  // --- LOGIC: TẠO DANH SÁCH NĂM ĐỘNG ---
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const endYear = currentYear + 5;
    const list = [];
    for (let y = startYear; y <= endYear; y++) {
      list.push(y);
    }
    return list;
  }, []);

  // --- Helper: Tính toán trạng thái (Confirmed / Pending / Overdue) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculateStatus = (item: any): ReadingStatus => {
    // 1. Đã nộp
    if (item.status === 1 || item.status === "Confirmed" || item.status === "confirmed") {
      return "Confirmed";
    }

    // 2. Tính toán Quá hạn
    const readingDate = new Date(item.createdAt || item.CreatedAt);
    const rMonth = readingDate.getMonth() + 1;
    const rYear = readingDate.getFullYear();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    const DEADLINE_DAY = 20; // Hạn nộp là ngày 20 hàng tháng

    // Nếu năm cũ -> Quá hạn
    if (rYear < currentYear) return "Overdue";
    // Nếu năm nay nhưng tháng cũ -> Quá hạn
    if (rYear === currentYear && rMonth < currentMonth) return "Overdue";
    // Nếu cùng tháng hiện tại nhưng đã qua ngày deadline -> Quá hạn
    if (rYear === currentYear && rMonth === currentMonth && currentDay > DEADLINE_DAY) return "Overdue";

    // 3. Còn lại -> Chờ nộp (Pending)
    return "Pending";
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData: any[] = await getAllMonthlyReadings();

        const mappedData: MonthlyReading[] = rawData.map((item) => ({
          id: item.id || item.Id,
          cycleId: item.cycleId || item.CycleId,
          houseName: item.houseName || item.HouseName,
          roomName: item.roomName || item.RoomName,
          floor: item.floor || item.Floor,
          tenantName: item.tenantName || item.TenantName,
          tenantContractId: item.tenantContractId || item.TenantContractId,

          status: calculateStatus(item),

          electricOld: item.electricOld || item.ElectricOld || 0,
          electricNew: item.electricNew || item.ElectricNew || 0,
          electricPhotoUrl: item.electricPhotoUrl || item.ElectricPhotoUrl,
          waterOld: item.waterOld || item.WaterOld || 0,
          waterNew: item.waterNew || item.WaterNew || 0,
          waterPhotoUrl: item.waterPhotoUrl || item.WaterPhotoUrl,
          createdAt: item.createdAt || item.CreatedAt,
          updatedAt: item.updatedAt || item.UpdatedAt,
        }));

        setReadings(mappedData);
      } catch (error) {
        console.error("Lỗi tải chỉ số từ API:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const uniqueHouses = useMemo(() => {
    const allHouseNames = readings.map((r) => r.houseName).filter((name): name is string => !!name);
    return Array.from(new Set(allHouseNames)).sort();
  }, [readings]);

  const filteredReadings = useMemo(() => {
    return readings.filter((reading) => {
      let matchStatus = true;
      if (statusFilter !== "ALL") matchStatus = reading.status === statusFilter;

      const matchHouse = selectedHouseName === "ALL" || reading.houseName === selectedHouseName;

      let matchDate = true;
      if (reading.createdAt) {
        const date = new Date(reading.createdAt);
        const rMonth = date.getMonth() + 1;
        const rYear = date.getFullYear();

        const matchMonth = selectedMonth === "ALL" || rMonth === Number(selectedMonth);
        const matchYear = rYear === Number(selectedYear);

        matchDate = matchMonth && matchYear;
      }
      return matchStatus && matchHouse && matchDate;
    });
  }, [readings, statusFilter, selectedHouseName, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    return {
      countConfirmed: filteredReadings.filter((i) => i.status === "Confirmed").length,
      // Đếm tổng số chưa hoàn thành (Pending + Overdue) để hiển thị ở card
      countNotSubmitted: filteredReadings.filter((i) => i.status === "Pending" || i.status === "Overdue").length,
      countOverdue: filteredReadings.filter((i) => i.status === "Overdue").length,
      totalRooms: filteredReadings.length,
    };
  }, [filteredReadings]);

  // --- Kiểm tra có phải tháng hiện tại không ---
  const isCurrentMonthView = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return Number(selectedMonth) === currentMonth && Number(selectedYear) === currentYear;
  }, [selectedMonth, selectedYear]);

  // --- Xử lý nhắc nhở ---
  const handleRemindAllPending = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    // Chặn nếu không phải tháng hiện tại
    if (!isCurrentMonthView) {
      alert("Bạn chỉ có thể gửi nhắc nhở cho kỳ thu tiền hiện tại.");
      return;
    }

    // Lấy danh sách chưa nộp (Pending + Overdue)
    const recipients = filteredReadings.filter((r) => r.status === "Pending" || r.status === "Overdue");
    if (recipients.length === 0) return;

    if (
      window.confirm(
        `Gửi thông báo nhắc nộp ảnh đến ${recipients.length} phòng chưa nộp (bao gồm cả quá hạn)?`
      )
    ) {
      alert(`Giả lập: Đã gửi thông báo đến ${recipients.length} phòng.`);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="flex flex-col gap-6">
        {/* Header Title */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản lý Chỉ số Điện Nước</h2>
            <p className="text-gray-500 text-sm">
              Thống kê tháng {selectedMonth === "ALL" ? "Tất cả" : selectedMonth}/{selectedYear}
            </p>
          </div>
        </div>

        {/* Component Thống kê */}
        <ReadingStats
          stats={stats}
          isCurrentMonthView={isCurrentMonthView}
          onRemindAllPending={handleRemindAllPending}
        />
      </div>

      {/* Component Bộ lọc */}
      <ReadingFilterBar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        selectedHouseName={selectedHouseName}
        setSelectedHouseName={setSelectedHouseName}
        uniqueHouses={uniqueHouses}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        years={years}
      />

      {/* Component Bảng dữ liệu */}
      <ReadingTable
        loading={loading}
        readings={filteredReadings}
        onSelectReading={setSelectedReading}
      />

      {/* Modal chi tiết */}
      {selectedReading && (
        <UtilityReadingDetailModal reading={selectedReading} onClose={() => setSelectedReading(null)} />
      )}
    </div>
  );
}