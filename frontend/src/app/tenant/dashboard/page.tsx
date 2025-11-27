"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

// =====================
// MAIN COMPONENT
// =====================
export default function TenantDashboard() {
    const [data, setData] = useState<DashboardData>({
        period: "2024-01",
        deadline: "2024-01-25",
        electric: {
            oldValue: 120,
            newValue: 145,
            status: "approved",
            imageUrl: null
        },
        water: {
            oldValue: 15,
            newValue: 18,
            status: "approved",
            imageUrl: null
        }
    })

    // HOÁ ĐƠN
    const [invoice, setInvoice] = useState<InvoiceData | null>(null)

    // Tự tạo hoá đơn khi cả nước + điện đều approved
    useEffect(() => {
        const ele = data.electric.status === "approved"
        const wat = data.water.status === "approved"

        if (ele && wat && !invoice) {
            const total =
                (data.electric.newValue - data.electric.oldValue) * 3500 +
                (data.water.newValue - data.water.oldValue) * 7000

            setInvoice({
                id: "inv_001",
                month: data.period,
                status: "unpaid",
                totalAmount: total,
                items: [
                    {
                        name: "Tiền điện",
                        qty: data.electric.newValue - data.electric.oldValue,
                        price: 3500
                    },
                    {
                        name: "Tiền nước",
                        qty: data.water.newValue - data.water.oldValue,
                        price: 7000
                    }
                ]
            })
        }
    }, [data, invoice])

    // Hàm xử lý upload
    const handleUpload = (type: "electric" | "water", file: File) => {
        const url = URL.createObjectURL(file)

        // Khi upload, chuyển trạng thái về pending
        setData(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                imageUrl: url,
                status: "pending"
            }
        }))

        // Upload lại → hoá đơn sẽ bị huỷ để duyệt lại
        setInvoice(null)
    }

    return (
        <div className="space-y-6">

            {/* Header kỳ thu */}
            <div className="bg-white p-5 rounded-xl shadow text-gray-700">
                <h2 className="font-bold text-lg">Kỳ thu tháng {data.period.replace("-", "/")}</h2>
                <p className="text-sm opacity-70">
                    Deadline gửi chỉ số: <b>{data.deadline}</b>
                </p>
            </div>

            {/* Grid Điện + Nước */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReadingCard
                    title="Chỉ số điện"
                    icon="⚡"
                    data={data.electric}
                    onUpload={(file) => handleUpload("electric", file)}
                />

                <ReadingCard
                    title="Chỉ số nước"
                    icon="💧"
                    data={data.water}
                    onUpload={(file) => handleUpload("water", file)}
                />
            </div>

            {/* ====================== */}
            {/*   HÓA ĐƠN THANH TOÁN   */}
            {/* ====================== */}
            {invoice && (
                <InvoiceCard invoice={invoice} setInvoice={setInvoice} />
            )}
        </div>
    )
}


// =====================
// INTERFACES
// =====================
interface ReadingData {
    oldValue: number
    newValue: number
    status: "approved" | "pending"
    imageUrl: string | null
}

interface DashboardData {
    period: string
    deadline: string
    electric: ReadingData
    water: ReadingData
}

interface ReadingCardProps {
    title: string
    icon: string
    data: ReadingData
    onUpload: (file: File) => void
}

interface InvoiceItem {
    name: string
    qty: number
    price: number
}

interface InvoiceData {
    id: string
    month: string
    status: "unpaid" | "paid"
    totalAmount: number
    items: InvoiceItem[]
}


// =====================
// READING CARD
// =====================
function ReadingCard({ title, icon, data, onUpload }: ReadingCardProps) {
    return (
        <div className="bg-white shadow p-5 rounded-xl">

            <h3 className="font-bold text-gray-700 text-lg mb-3">
                {icon} {title}
            </h3>

            {/* Upload */}
            <label className="block cursor-pointer">
                <input
                    type="file"
                    hidden
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onUpload(file)
                    }}
                />

                <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg text-center">
                    {data.imageUrl ? (
                        <Image
                            src={data.imageUrl}
                            alt="meter"
                            width={260}
                            height={120}
                            className="rounded-lg object-contain mx-auto"
                        />
                    ) : (
                        <span className="opacity-60">Chọn ảnh công tơ</span>
                    )}
                </div>
            </label>

            {/* Giá trị */}
            <div className="mt-4 text-sm text-gray-700">
                <p>Chỉ số tháng trước: <b>{data.oldValue}</b></p>
                <p>Chỉ số tháng này (AI): <b>{data.newValue}</b></p>
                <p className="mt-1">
                    Trạng thái:{" "}
                    {data.status === "pending" ? (
                        <span className="text-yellow-600 font-semibold">Đang chờ duyệt</span>
                    ) : (
                        <span className="text-green-600 font-semibold">Đã duyệt</span>
                    )}
                </p>
            </div>
        </div>
    )
}


// =====================
// INVOICE CARD
// =====================
function InvoiceCard({
    invoice,
    setInvoice
}: {
    invoice: InvoiceData,
    setInvoice: (inv: InvoiceData | null) => void
}) {

    const [showQR, setShowQR] = useState(false)

    return (
        <div className="bg-white shadow p-5 rounded-xl">

            <h3 className="font-bold text-lg text-gray-700 mb-3">
                Hóa đơn tháng {invoice.month.replace("-", "/")}
            </h3>

            {/* Items */}
            <div className="space-y-2 text-gray-700">
                {invoice.items.map((i, idx) => (
                    <p key={idx}>
                        {i.name}: {i.qty} × {i.price.toLocaleString()}đ ={" "}
                        <b>{(i.qty * i.price).toLocaleString()}đ</b>
                    </p>
                ))}
            </div>

            {/* TOTAL */}
            <p className="mt-3 text-lg font-bold  text-gray-700">
                Tổng tiền: {invoice.totalAmount.toLocaleString()}đ
            </p>

            {/* STATUS */}
            <p className="mt-1  text-gray-700">
                Trạng thái:{" "}
                {invoice.status === "paid" ? (
                    <span className="text-green-600 font-semibold">Đã thanh toán</span>
                ) : (
                    <span className="text-red-600 font-semibold">Chưa thanh toán</span>
                )}
            </p>

            {/* PAY BUTTON */}
            {invoice.status === "unpaid" && (
                <button
                    onClick={() => setShowQR(true)}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                    Thanh toán
                </button>
            )}

            {/* QR POPUP */}
            {showQR && (
                <div className="mt-4 border rounded-lg p-4 bg-gray-50 text-center">
                    <p className="font-semibold mb-2">QR thanh toán</p>

                    <Image
                        src="/qr.png"
                        alt="qr"
                        width={200}
                        height={200}
                        className="mx-auto"
                    />

                    <button
                        onClick={() => {
                            setInvoice({ ...invoice, status: "paid" })
                            setShowQR(false)
                        }}
                        className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg"
                    >
                        Tôi đã thanh toán
                    </button>
                </div>
            )}
        </div>
    )
}
