"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

/* ------------------------------
    INTERFACES GIỮ NGUYÊN
------------------------------ */
interface InvoiceItem {
    name: string;
    qty: number;
    price: number;
    amount: number;
}
interface Invoice {
    id: number;
    month: string;
    status: string;
    items: InvoiceItem[];
    total: number;
}
interface ReadingCardProps {
    title: string;
    icon: string;
    oldValue: number;
    newValue: number;
    usedValue?: number;
    status: string | number;
    imageUrl: string;
    isLoading?: boolean;
    onUpload: (file: File) => void;
}

interface ApiInvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    productCode?: string;
}

interface ReadingValue {
    old: number;
    new: number;
    img: string;
    status: string | number;
}
interface ReadingCycle {
    id: number;
    cycleMonth: number;
    cycleYear: number;
}

/* ------------------------------
    API URL
------------------------------ */
const IMAGE_API = process.env.NEXT_PUBLIC_IMAGE_SCAN_API_URL;
const READING_API = process.env.NEXT_PUBLIC_READING_API_URL;
const INVOICE_API = process.env.NEXT_PUBLIC_INVOICE_API_URL;

function authHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
    };
}

// ✅ Hàm chuyển đổi trạng thái (Hỗ trợ cả số như 1 và chuỗi)
function mapStatusToVietnamese(status: string | number | null | undefined): string {
    if (status === null || status === undefined || status === "") {
        return "Đang tải...";
    }

    let statusString: string;

    if (typeof status === 'number') {
        statusString = status.toString();
    } else {
        // Tránh lỗi toLowerCase nếu status là chuỗi không hợp lệ
        statusString = status.toLowerCase().trim();
    }

    switch (statusString) {
        case "pending":
        case "0":
            return "Chờ xác nhận";
        case "approved":
        case "submitted":
        case "1":
            return "Đã xác nhận";
        default:
            return status.toString();
    }
}

/* ============================================
    MAIN COMPONENT
=============================================== */
export default function TenantDashboard() {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [cycle, setCycle] = useState<ReadingCycle | null>(null);
    const [loadingCycle, setLoadingCycle] = useState(true);
    const [uploadingElec, setUploadingElec] = useState(false);
    const [uploadingWater, setUploadingWater] = useState(false);
    const [electricFile, setElectricFile] = useState<File | null>(null);
    const [waterFile, setWaterFile] = useState<File | null>(null);

    const [electric, setElectric] = useState<ReadingValue>({
        old: 0, new: 0, img: "", status: "pending"
    });

    const [water, setWater] = useState<ReadingValue>({
        old: 0, new: 0, img: "", status: "pending"
    });

    // Theo dõi trạng thái hóa đơn để quyết định disable nút
    const [invoiceStatus, setInvoiceStatus] = useState<'pending' | 'created' | 'paid'>('pending');
    const [invoice, setInvoice] = useState<Invoice | null>(null);

    /* ------------------------------
        1️⃣ LOAD CYCLE (chỉ 1 lần)
    --------------------------------*/
    useEffect(() => {
        async function fetchCycle() {
            const res = await fetch(`${READING_API}/ReadingCycle`, { headers: authHeaders() });
            const data = await res.json() as ReadingCycle[];
            if (data?.length) {
                const latest = data.sort((a: ReadingCycle, b: ReadingCycle) =>
                    b.cycleYear - a.cycleYear || b.cycleMonth - a.cycleMonth
                )[0];
                setCycle(latest);
            }
            setLoadingCycle(false);
        }
        fetchCycle();
    }, []);

    /* ------------------------------
        2️⃣ LOAD READING (chỉ 1 lần sau khi có cycle)
    --------------------------------*/
    useEffect(() => {
        if (!cycle) return;

        async function fetchReading(cycleId: number) {
            const res = await fetch(`${READING_API}/MonthlyReading/by-cycle/${cycleId}`, {
                headers: authHeaders(),
            });

            if (res.status === 404) return;

            const data = await res.json();

            // Helper: Lấy object key từ URL S3
            async function getPresignedUrl(photoUrl: string | null | undefined) {
                if (!photoUrl) return "";
                try {
                    const u = new URL(photoUrl);
                    const key = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
                    const resp = await fetch(`${READING_API}/MonthlyReading/image-proxy?key=${encodeURIComponent(key)}`);
                    if (!resp.ok) return "";
                    const json = await resp.json();
                    return json.url || "";
                } catch {
                    return "";
                }
            }

            const [electricImg, waterImg] = await Promise.all([
                getPresignedUrl(data.electricPhotoUrl),
                getPresignedUrl(data.waterPhotoUrl)
            ]);

            setElectric({
                old: data.electricOld,
                new: data.electricNew,
                img: electricImg,
                status: data.status // Có thể là số 1 hoặc chuỗi "approved"
            });

            setWater({
                old: data.waterOld,
                new: data.waterNew,
                img: waterImg,
                status: data.status // Có thể là số 1 hoặc chuỗi "approved"
            });

            setIsInitialLoading(false);
        }

        fetchReading(cycle.id);
    }, [cycle]);


    /* ------------------------------
        3️⃣ UPLOAD ẢNH — chỉ cập nhật state
    --------------------------------*/
    async function handleUpload(type: "electric" | "water", file: File) {

        if (type === "electric") setUploadingElec(true);
        else setUploadingWater(true);

        // gửi file lên AI OCR để lấy số
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${IMAGE_API}/${type}/upload`, {
            method: "POST",
            body: form
        });

        const data = await res.json();
        const aiValue = Number(data.reading);

        const preview = URL.createObjectURL(file);

        if (type === "electric") {
            setElectricFile(file);
            setElectric(p => ({ ...p, new: aiValue, img: preview, status: "pending" }));
        } else {
            setWaterFile(file);
            setWater(p => ({ ...p, new: aiValue, img: preview, status: "pending" }));
        }

        if (type === "electric") setUploadingElec(false);
        else setUploadingWater(false);
    }


    /* ------------------------------
        4️⃣ SUBMIT — đúng thời điểm, không auto
    --------------------------------*/
    async function handleApprove() {
        if (!cycle) return;

        const form = new FormData();
        form.append("electricNew", electric.new.toString());
        form.append("waterNew", water.new.toString());

        if (electricFile) {
            form.append("electricPhoto", electricFile);
        }

        if (waterFile) {
            form.append("waterPhoto", waterFile);
        }

        const res = await fetch(`${READING_API}/MonthlyReading/${cycle.id}/submit`, {
            method: "POST",
            headers: authHeaders(),
            body: form
        });

        if (res.ok) {
            // Cập nhật trạng thái hiển thị
            setElectric(p => ({ ...p, status: "approved" }));
            setWater(p => ({ ...p, status: "approved" }));

            // Gọi tạo hóa đơn
            createInvoice();
        }
    }


    /* ------------------------------
        5️⃣ Tạo hóa đơn — gọi duy nhất sau submit
    --------------------------------*/
    async function createInvoice() {
        if (!cycle) return;

        const body = {
            cycleId: cycle.id,
            electricUsage: electric.new - electric.old,
            waterUsage: water.new - water.old,
        };

        const res = await fetch(`${INVOICE_API}/invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(body)
        });

        const inv = await res.json();
        console.log("Invoice RAW:", inv);

        // Cập nhật trạng thái hóa đơn sau khi tạo thành công (Cách tiếp cận mới)
        if (res.ok) {
            setInvoiceStatus('created');
        }

        setInvoice({
            id: inv.id,
            month: `${cycle.cycleMonth}/${cycle.cycleYear}`,
            status: inv.status,
            total: Number(inv.totalAmount ?? 0),
            items: inv.items?.map((i: ApiInvoiceItem) => ({
                name: i.description ?? "",
                qty: Number(i.quantity ?? 0),
                price: Number(i.unitPrice ?? 0),
                amount: Number(i.amount ?? ((i.quantity ?? 0) * (i.unitPrice ?? 0))),
            })) ?? []
        });
    }

    const isConfirmedReading = mapStatusToVietnamese(electric.status) === "Đã xác nhận" && mapStatusToVietnamese(water.status) === "Đã xác nhận";
    /* ------------------------------
        UI ĐÃ CHỈNH SỬA
------------------------------ */
    return (
        <div className="space-y-7">
            {cycle && (
                <div className="bg-white p-5 rounded-xl shadow text-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg">
                            Kỳ thu tháng {cycle.cycleMonth}/{cycle.cycleYear}
                        </h2>
                        <div>
                            <button
                                onClick={handleApprove}
                                disabled={isInitialLoading || isConfirmedReading || invoiceStatus === 'created'}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isInitialLoading ? "Đang tải dữ liệu..." : "Xác nhận số liệu"}
                            </button>

                            {/* Thêm dòng thông báo nếu đã xác nhận hoặc hóa đơn đã tạo */}
                            {(isConfirmedReading || invoiceStatus === 'created') && (
                                <p className="mt-3 text-sm text-green-700 font-medium">
                                    ✅ Đã xác nhận chỉ số thành công. Hóa đơn đã được tạo.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                <ReadingCard {...{
                    title: "Chỉ số điện",
                    icon: "⚡",
                    oldValue: electric.old,
                    newValue: electric.new,
                    usedValue: electric.new - electric.old,
                    status: electric.status,
                    imageUrl: electric.img,
                    isLoading: uploadingElec,
                    onUpload: (f: File) => handleUpload("electric", f)
                }} />

                <ReadingCard {...{
                    title: "Chỉ số nước",
                    icon: "💧",
                    oldValue: water.old,
                    newValue: water.new,
                    usedValue: water.new - water.old,
                    status: water.status,
                    imageUrl: water.img,
                    isLoading: uploadingWater,
                    onUpload: (f: File) => handleUpload("water", f)
                }} />
            </div>
        </div>
    );
}

/* ------------------------------
    ReadingCard ĐÃ CHỈNH SỬA (Thêm chuyển đổi tiếng Việt và disable input)
------------------------------ */
function ReadingCard({
    title,
    icon,
    oldValue,
    newValue,
    usedValue,
    status,
    imageUrl,
    isLoading,
    onUpload
}: ReadingCardProps) {

    // Sử dụng hàm chuyển đổi đã fix lỗi để hiển thị trạng thái bằng tiếng Việt
    const statusVietnamese = mapStatusToVietnamese(status);

    // Kiểm tra trạng thái để disable input file
    const isApproved = statusVietnamese === "Đã xác nhận";

    return (
        <div className="bg-white shadow p-5 rounded-xl">
            <h3 className="font-bold">{icon} {title}</h3>

            <label className="block cursor-pointer">
                <input
                    type="file"
                    hidden
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUpload(file);
                    }}
                    // Disable input file nếu đã xác nhận
                    disabled={isApproved}
                />

                <div className="relative w-full h-[300px] bg-gray-100 flex items-center justify-center rounded-lg">
                    {isLoading ? (
                        "Đang xử lý ảnh..."
                    ) : imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt="Ảnh đồng hồ chỉ số"
                            fill
                            className="object-contain rounded-lg"
                        />
                    ) : (
                        "Chọn ảnh"
                    )}
                </div>
            </label>

            <p>Chỉ số tháng trước: {oldValue}</p>
            <p>Chỉ số tháng này: {newValue}</p>
            <p>Chỉ tố tiêu thụ: {usedValue}</p>
            <p>Trạng thái: {statusVietnamese}</p>
        </div>
    );
}