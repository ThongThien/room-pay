"use client";

import { useState, useEffect } from "react";
import { ReadingCycle, ReadingValue } from "@/types/reading";
import { readingService } from "@/services/readingService";
import { mapStatusToVietnamese } from "@/utils/formatters";
import ReadingCard from "@/components/submit/ReadingCard";
import AlertModal from "@/components/submit/AlertModal";
import ConfirmSubmitModal from "@/components/submit/ConfirmSubmitModal";

export default function SubmitMeterPage() {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [cycle, setCycle] = useState<ReadingCycle | null>(null);
    const [uploadingElec, setUploadingElec] = useState(false);
    const [uploadingWater, setUploadingWater] = useState(false);
    
    // File state
    const [electricFile, setElectricFile] = useState<File | null>(null);
    const [waterFile, setWaterFile] = useState<File | null>(null);

    // Data state
    const [electric, setElectric] = useState<ReadingValue>({ old: 0, new: 0, img: "", status: "pending" });
    const [water, setWater] = useState<ReadingValue>({ old: 0, new: 0, img: "", status: "pending" });
    const [invoiceStatus, setInvoiceStatus] = useState<'pending' | 'created' | 'paid'>('pending');
    
    // UI state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'success' | 'warning'; }>({ isOpen: false, title: "", message: "", type: 'error' });

    const showAlert = (title: string, message: string, type: 'error' | 'success' | 'warning' = 'error') => {
        setAlertState({ isOpen: true, title, message, type });
    };

    // 1️⃣ LOAD DATA
    useEffect(() => {
        async function init() {
            try {
                const cycles = await readingService.getCycles();
                if (cycles?.length) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const latest = cycles.sort((a: any, b: any) => b.cycleYear - a.cycleYear || b.cycleMonth - a.cycleMonth)[0];
                    setCycle(latest);
                }
            } catch (e) { console.error(e); }
        }
        init();
    }, []);

    useEffect(() => {
        if (!cycle) return;
        async function fetchReading() {
            try {
                const data = await readingService.getReadingByCycle(cycle!.id);
                if (!data) return;

                const [electricImg, waterImg] = await Promise.all([
                    readingService.getPresignedUrl(data.electricPhotoUrl),
                    readingService.getPresignedUrl(data.waterPhotoUrl)
                ]);

                setElectric({ old: data.electricOld, new: data.electricNew, img: electricImg, status: data.status });
                setWater({ old: data.waterOld, new: data.waterNew, img: waterImg, status: data.status });
                if (mapStatusToVietnamese(data.status) === "Đã xác nhận") setInvoiceStatus('created');
            } catch (e) { console.error(e); } finally {
                setIsInitialLoading(false);
            }
        }
        fetchReading();
    }, [cycle]);

    // 2️⃣ UPLOAD HANDLER
    async function handleUpload(type: "electric" | "water", file: File) {
        if (type === "electric") setUploadingElec(true); else setUploadingWater(true);
        
        try {
            const data = await readingService.uploadImage(type, file);
            const aiValue = Number(data.reading);
            const preview = URL.createObjectURL(file);
            const currentOld = type === "electric" ? electric.old : water.old;

            // Xử lý NaN
            if (isNaN(aiValue)) {
                showAlert("Lỗi đọc ảnh", "Không đọc được chỉ số vui lòng upload lại hình ảnh.", 'error');
                if (type === "electric") { setElectricFile(file); setElectric(p => ({ ...p, new: NaN, img: preview, status: "pending" })); }
                else { setWaterFile(file); setWater(p => ({ ...p, new: NaN, img: preview, status: "pending" })); }
            } 
            // Xử lý số đọc được
            else {
                if (aiValue < currentOld) {
                    showAlert("Cảnh báo chỉ số", `Chỉ số mới (${aiValue}) nhỏ hơn chỉ số cũ (${currentOld})!`, 'warning');
                }
                if (type === "electric") { setElectricFile(file); setElectric(p => ({ ...p, new: aiValue, img: preview, status: "pending" })); }
                else { setWaterFile(file); setWater(p => ({ ...p, new: aiValue, img: preview, status: "pending" })); }
            }
        } catch {
            showAlert("Lỗi hệ thống", "Có lỗi khi đọc ảnh, vui lòng thử lại sau.", 'error');
        } finally {
            if (type === "electric") setUploadingElec(false); else setUploadingWater(false);
        }
    }

    // 3️⃣ PRE-SUBMIT
    function handlePreSubmit() {
        if (isNaN(electric.new) || isNaN(water.new)) { showAlert("Dữ liệu không hợp lệ", "Chỉ số không hợp lệ (NaN).", 'error'); return; }
        if (electric.new < electric.old) { showAlert("Lỗi chỉ số điện", "Chỉ số Điện mới nhỏ hơn cũ.", 'error'); return; }
        if (water.new < water.old) { showAlert("Lỗi chỉ số nước", "Chỉ số Nước mới nhỏ hơn cũ.", 'error'); return; }
        setShowConfirmModal(true);
    }

    // 4️⃣ FINAL SUBMIT
    async function handleFinalSubmit() {
        if (!cycle) return;
        setShowConfirmModal(false);
        setIsInitialLoading(true);

        const form = new FormData();
        form.append("electricNew", electric.new.toString());
        form.append("waterNew", water.new.toString());
        if (electricFile) form.append("electricPhoto", electricFile);
        if (waterFile) form.append("waterPhoto", waterFile);

        try {
            const res = await readingService.submitReadings(cycle.id, form);
            if (res.ok) {
                // Cập nhật UI ngay lập tức
                setElectric(p => ({ ...p, status: "approved" }));
                setWater(p => ({ ...p, status: "approved" }));
                
                // Tạo hóa đơn
                await readingService.createInvoice({
                    cycleId: cycle.id,
                    electricUsage: electric.new - electric.old,
                    waterUsage: water.new - water.old
                });
                
                setInvoiceStatus('created');
            } else {
                showAlert("Gửi thất bại", "Vui lòng thử lại.", 'error');
            }
        } catch {
            showAlert("Lỗi kết nối", "Không thể kết nối đến máy chủ.", 'error');
        } finally {
            setIsInitialLoading(false);
        }
    }

    // Logic tính toán cho UI
    const isConfirmedReading = mapStatusToVietnamese(electric.status) === "Đã xác nhận" && mapStatusToVietnamese(water.status) === "Đã xác nhận";
    const hasNegativeError = (electric.new < electric.old) || (water.new < water.old);
    const hasNaNError = isNaN(electric.new) || isNaN(water.new);
    const isSubmitDisabled = isInitialLoading || isConfirmedReading || invoiceStatus === 'created' || hasNegativeError || hasNaNError;

    // Logic cảnh báo
    const elecUsage = electric.new - electric.old;
    const waterUsage = water.new - water.old;
    const LIMIT_ELEC = 500;
    const LIMIT_WATER = 30;
    const isHighElec = !isNaN(electric.new) && elecUsage > LIMIT_ELEC;
    const isHighWater = !isNaN(water.new) && waterUsage > LIMIT_WATER;
    const hasWarning = isHighElec || isHighWater;

    return (
        <div className="space-y-7 relative">
            {cycle && (
                <div className="bg-white p-5 rounded-xl shadow text-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg">Kỳ thu tháng {cycle.cycleMonth}/{cycle.cycleYear}</h2>
                        <button
                            onClick={handlePreSubmit}
                            disabled={isSubmitDisabled}
                            className={`px-4 py-2 rounded-lg text-white ${isSubmitDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
                        >
                            {isInitialLoading ? "Đang xử lý..." : "Xác nhận số liệu"}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                <ReadingCard title="Chỉ số điện" icon="⚡" oldValue={electric.old} newValue={electric.new} usedValue={electric.new - electric.old} status={electric.status} imageUrl={electric.img} isLoading={uploadingElec} onUpload={(f) => handleUpload("electric", f)} />
                <ReadingCard title="Chỉ số nước" icon="💧" oldValue={water.old} newValue={water.new} usedValue={water.new - water.old} status={water.status} imageUrl={water.img} isLoading={uploadingWater} onUpload={(f) => handleUpload("water", f)} />
            </div>

            <ConfirmSubmitModal 
                isOpen={showConfirmModal} 
                onClose={() => setShowConfirmModal(false)} 
                onConfirm={handleFinalSubmit}
                hasWarning={hasWarning}
                isHighElec={isHighElec}
                isHighWater={isHighWater}
                elecUsage={elecUsage}
                waterUsage={waterUsage}
                limits={{ elec: LIMIT_ELEC, water: LIMIT_WATER }}
            />

            <AlertModal 
                isOpen={alertState.isOpen} 
                title={alertState.title} 
                message={alertState.message} 
                type={alertState.type} 
                onClose={() => setAlertState(p => ({ ...p, isOpen: false }))} 
            />
        </div>
    );
}