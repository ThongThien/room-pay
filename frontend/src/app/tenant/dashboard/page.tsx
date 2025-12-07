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
    status: "paid" | "unpaid";
    items: InvoiceItem[];
    total: number;
}
interface ReadingCardProps {
    title: string;
    icon: string;
    oldValue: number;
    newValue: number;
    status: string;
    imageUrl: string;
    isLoading?: boolean;
    onUpload: (file: File) => void;
}
interface InvoiceCardProps {
    invoice: Invoice;
    setInvoice: (invoice: Invoice | null) => void;
}
interface InvoiceItem {

    name: string;

    qty: number;

    price: number;

}
interface Invoice {

    id: number;

    month: string;

    status: "paid" | "unpaid";

    items: InvoiceItem[];

    total: number;

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
    status: string;
}
interface ReadingCycle {
    id: number;
    cycleMonth: number;
    cycleYear: number;
}

/* ------------------------------
    API URL
------------------------------ */
const IMAGE_API = "http://localhost:5000";
const READING_API = "http://localhost:5176";
const INVOICE_API = "http://localhost:5150";

function authHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
    };
}

/* ============================================
   MAIN COMPONENT
=============================================== */
export default function TenantDashboard() {

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

    const [invoice, setInvoice] = useState<Invoice | null>(null);

    /* ------------------------------
       1️⃣ LOAD CYCLE (chỉ 1 lần)
    --------------------------------*/
    useEffect(() => {
        async function fetchCycle() {
            const res = await fetch(`${READING_API}/api/ReadingCycle`, { headers: authHeaders() });
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
            const res = await fetch(`${READING_API}/api/MonthlyReading/by-cycle/${cycleId}`, {
                headers: authHeaders(),
            });

            if (res.status === 404) return;

            const data = await res.json();

            setElectric({
                old: data.electricOld,
                new: data.electricNew,
                img: data.electricPhotoUrl,
                status: data.status
            });

            setWater({
                old: data.waterOld,
                new: data.waterNew,
                img: data.waterPhotoUrl,
                status: data.status
            });
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

        const res = await fetch(`${IMAGE_API}/api/${type}/upload`, {
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

        const res = await fetch(`${READING_API}/api/MonthlyReading/${cycle.id}/submit`, {
            method: "POST",
            headers: authHeaders(),
            body: form
        });

        if (res.ok) {
            setElectric(p => ({ ...p, status: "approved" }));
            setWater(p => ({ ...p, status: "approved" }));
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

        const res = await fetch(`${INVOICE_API}/api/invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(body)
        });

        const inv = await res.json();

        setInvoice({
            id: inv.id,
            month: `${cycle.cycleMonth}/${cycle.cycleYear}`,
            status: inv.status,
            total: Number(inv.totalAmount ?? 0),
            items: inv.items?.map((i: ApiInvoiceItem) => ({
                name: i.description ?? "",
                qty: i.quantity ?? 0,
                price: i.unitPrice ?? 0,
                amount: i.amount ?? ((i.quantity ?? 0) * (i.unitPrice ?? 0)),
            })) ?? []

        });

    }

    /* ------------------------------
        UI GIỮ NGUYÊN
------------------------------ */
    return (
        <div className="space-y-7">
            {cycle && (
                <div className="bg-white p-5 rounded-xl shadow text-gray-700">
                    <h2 className="font-bold text-lg">
                        Kỳ thu tháng {cycle.cycleMonth}/{cycle.cycleYear}
                    </h2>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReadingCard {...{
                    title: "Chỉ số điện",
                    icon: "⚡",
                    oldValue: electric.old,
                    newValue: electric.new,
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
                    status: water.status,
                    imageUrl: water.img,
                    isLoading: uploadingWater,
                    onUpload: (f: File) => handleUpload("water", f)
                }} />
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
                <button
                    onClick={handleApprove}
                    disabled={!electric.img || !water.img}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Xác nhận số liệu
                </button>
            </div>

            {invoice && <InvoiceCard invoice={invoice} setInvoice={setInvoice} />}
        </div>
    );
}

/* ------------------------------
    ReadingCard GIỮ NGUYÊN
------------------------------ */
function ReadingCard({
    title,
    icon,
    oldValue,
    newValue,
    status,
    imageUrl,
    isLoading,
    onUpload
}: ReadingCardProps) {
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
                />

                <div className="relative w-full h-[300px] bg-gray-100 flex items-center justify-center rounded-lg">
                    {isLoading ? (
                        "Đang xử lý ảnh..."
                    ) : imageUrl ? (
                        <Image src={imageUrl} alt="" fill className="object-contain" />
                    ) : (
                        "Chọn ảnh"
                    )}
                </div>
            </label>

            <p>Old: {oldValue}</p>
            <p>AI New: {newValue}</p>
            <p>Status: {status}</p>
        </div>
    );
}

/* ------------------------------
    INVOICE CARD
------------------------------ */

function InvoiceCard({ invoice, setInvoice }: InvoiceCardProps) {
    async function pay() {
        const res = await fetch(
            `${INVOICE_API}/api/invoices/${invoice.id}/mark-paid`,
            { method: "POST", headers: authHeaders() }
        );
        const data = await res.json();
        setInvoice({
            ...invoice,
            status: "paid"
        });
    }

    return (
        <div className="bg-white shadow p-5 rounded-xl">
            <h3 className="font-bold text-lg text-gray-700 mb-3">
                Hóa đơn tháng {invoice.month}
            </h3>

            <div className="space-y-2">

                {invoice.items.map((i, idx) => (
                    <p key={idx}>
                        {i.qty} × {i.price.toLocaleString()}đ =
                        <b> {i.amount.toLocaleString()}đ</b>
                    </p>
                ))}
            </div>

            <p className="text-lg font-bold mt-3">
                Tổng tiền: {invoice.total.toLocaleString()}đ
            </p>

            {invoice.status === "unpaid" && (
                <button
                    onClick={pay}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                    Tôi đã thanh toán
                </button>
            )}
        </div>
    );
}
