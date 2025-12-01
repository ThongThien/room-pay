"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

/* ============================================
   INTERFACES
=============================================== */
// Định nghĩa chi tiết 1 dòng trong hóa đơn
interface InvoiceItem {
    name: string
    qty: number
    price: number
}

// Định nghĩa cấu trúc Hóa đơn hoàn chỉnh
interface Invoice {
    id: string
    month: string
    status: "paid" | "unpaid" // Giới hạn giá trị chuỗi cho chặt chẽ hơn
    items: InvoiceItem[]
    total: number
}

// Định nghĩa Props cho Component ReadingCard
interface ReadingCardProps {
    title: string
    icon: string
    oldValue: number
    newValue: number
    status: string
    imageUrl: string
    isLoading?: boolean
    onUpload: (file: File) => void
}

// Định nghĩa Props cho Component InvoiceCard
interface InvoiceCardProps {
    invoice: Invoice
    setInvoice: (invoice: Invoice | null) => void
}

interface ApproveReadingPayload {
    electric: ReadingValue
    water: ReadingValue
}

interface ReadingValue {
    old: number
    new: number
    img: string
    status: string
}

interface InvoiceData {
    electricQty: number
    waterQty: number
}

interface ReadingCycle {
    month: number
    year: number
    deadline: string
}

/* ============================================
   FAKE API
=============================================== */
const FakeAPI = {
    getCurrentReadingCycle: async () => {
        return {
            month: 1,
            year: 2024,
            deadline: "2024-01-25"
        }
    },

    uploadImage: async (type: "electric" | "water", file: File) => {
        const formData = new FormData()
        formData.append("file", file)

        // GỌI ĐÚNG VÀO BACKEND THẬT
        const url = `http://localhost:5000/api/${type}/upload`

        const res = await fetch(url, {
            method: "POST",
            body: formData
        })

        const data = await res.json()

        if (!res.ok || data.success === false) {
            console.error(`Upload ${type} lỗi:`, data.error)
            throw new Error(data.error || "Upload thất bại")
        }

        // Convert ảnh local để hiển thị
        const imageUrl = URL.createObjectURL(file)

        return {
            imageUrl,
            aiValue: Number(data.reading)
        }
    },

    createInvoice: async (data: InvoiceData) => {
        await new Promise(r => setTimeout(r, 500))
        return {
            id: "inv_fake_001",
            month: "2024-01",
            status: "unpaid",
            items: [
                { name: "Tiền điện", qty: data.electricQty, price: 3500 },
                { name: "Tiền nước", qty: data.waterQty, price: 7000 }
            ]
        }
    },

    payInvoice: async () => {
        await new Promise(r => setTimeout(r, 500))
        return { status: "paid" }
    },

    approveReading: async (payload: ApproveReadingPayload) => {
        await new Promise(r => setTimeout(r, 500))
        return { success: true }
    }
}

/* ============================================
   MAIN COMPONENT
=============================================== */
export default function TenantDashboard() {
    const [cycle, setCycle] = useState<ReadingCycle | null>(null)
    const [uploadingElec, setUploadingElec] = useState(false)
    const [uploadingWater, setUploadingWater] = useState(false)
    const [electric, setElectric] = useState<ReadingValue>({
        old: 18050,
        new: 0,
        img: "",
        status: "pending"
    })

    const [water, setWater] = useState<ReadingValue>({
        old: 1850,
        new: 0,
        img: "",
        status: "pending"
    })

    const [invoice, setInvoice] = useState<Invoice | null>(null)
    /* LOAD KỲ THU */
    useEffect(() => {
        FakeAPI.getCurrentReadingCycle().then(res => setCycle(res))
    }, [])

    /* TẠO HÓA ĐƠN TỰ ĐỘNG */
    useEffect(() => {
        const ready =
            electric.status === "approved" && water.status === "approved"

        if (ready && !invoice) {
            FakeAPI.createInvoice({
                electricQty: electric.new - electric.old,
                waterQty: water.new - water.old
            }).then(res => {
                const total =
                    res.items[0].qty * res.items[0].price +
                    res.items[1].qty * res.items[1].price

                setInvoice({ ...res, total } as Invoice)
            })
        }
    }, [electric, water, invoice])

    /* UPLOAD ẢNH */
    const handleUpload = async (type: "electric" | "water", file: File) => {
        // Bật loading đúng card
        if (type === "electric") setUploadingElec(true)
        if (type === "water") setUploadingWater(true)

        try {
            const res = await FakeAPI.uploadImage(type, file)

            if (type === "electric") {
                setElectric(prev => ({
                    ...prev,
                    img: res.imageUrl,
                    new: res.aiValue,
                    status: "pending"
                }))
            }

            if (type === "water") {
                setWater(prev => ({
                    ...prev,
                    img: res.imageUrl,
                    new: res.aiValue,
                    status: "pending"
                }))
            }

            setInvoice(null)

        } catch (err) {
            alert(`Ảnh mờ hoặc đọc lỗi: Hãy thử upload lại!`)
        }

        // Tắt loading
        if (type === "electric") setUploadingElec(false)
        if (type === "water") setUploadingWater(false)
    }


    /* XÁC NHẬN CHỈ SỐ */
    const handleApprove = async () => {
        await FakeAPI.approveReading({ electric, water })

        setElectric(prev => ({ ...prev, status: "approved" }))
        setWater(prev => ({ ...prev, status: "approved" }))
    }

    return (
        <div className="space-y-7">

            {/* SECTION 1: Kỳ thu */}
            {cycle && (
                <div className="bg-white p-5 rounded-xl shadow text-gray-700">
                    <h2 className="font-bold text-lg">
                        Kỳ thu tháng {cycle.month}/{cycle.year}
                    </h2>
                    <p className="text-sm opacity-70">
                        Deadline gửi chỉ số: <b>{cycle.deadline}</b>
                    </p>
                </div>
            )}

            {/* SECTION 2: Điện + nước */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReadingCard
                    title="Chỉ số điện"
                    icon="⚡"
                    oldValue={electric.old}
                    newValue={electric.new}
                    status={electric.status}
                    imageUrl={electric.img}
                    isLoading={uploadingElec}
                    onUpload={(f: File) => handleUpload("electric", f)}
                />

                <ReadingCard
                    title="Chỉ số nước"
                    icon="💧"
                    oldValue={water.old}
                    newValue={water.new}
                    status={water.status}
                    imageUrl={water.img}
                    isLoading={uploadingWater}
                    onUpload={(f: File) => handleUpload("water", f)}
                />
            </div>

            {/* SECTION 3: Xác nhận */}
            <div className="bg-white p-5 rounded-xl shadow">
                <h3 className="font-bold text-gray-700 mb-3">
                    Xác nhận chỉ số tháng
                </h3>

                <button
                    onClick={handleApprove}
                    disabled={
                        electric.new === 0 ||
                        water.new === 0 ||
                        electric.status === "approved"
                    }
                    className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-40"
                >
                    Xác nhận số liệu
                </button>
            </div>

            {/* SECTION 4: Hóa đơn */}
            {invoice && (
                <InvoiceCard invoice={invoice} setInvoice={setInvoice} />
            )}
        </div>
    )
}

/* ============================================
   COMPONENT: Reading Card
=============================================== */
// Destructuring props trực tiếp và gán type
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
                <div className="relative w-full h-[400px] border border-gray-200 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                    {isLoading ? (
                        <span className="animate-pulse text-blue-600 font-medium">
                            ⏳ Đang xử lý ảnh...
                        </span>
                    ) : imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt="meter"
                            fill
                            className="object-contain p-2"
                        />
                    ) : (
                        <span className="opacity-60 text-gray-700">
                            Chọn ảnh công tơ
                        </span>
                    )}
                </div>

            </label>

            <div className="mt-4 text-sm text-gray-700 space-y-1">
                <p>Chỉ số tháng trước: <b>{oldValue}</b></p>
                <p>Chỉ số tháng này (AI): <b>{newValue}</b></p>

                <p className="mt-1">
                    Trạng thái:{" "}
                    {status === "pending" ? (
                        <span className="text-yellow-600 font-semibold">Chờ xác nhận</span>
                    ) : (
                        <span className="text-green-600 font-semibold">Đã duyệt</span>
                    )}
                </p>
            </div>
        </div>
    )
}

/* ============================================
   COMPONENT: INVOICE
=============================================== */
function InvoiceCard({ invoice, setInvoice }: InvoiceCardProps) {
    const [showQR, setShowQR] = useState(false)
    const [paymentStatus, setPaymentStatus] = useState<"pending" | "success">("pending")
    const handlePay = async () => {
        const res = await FakeAPI.payInvoice()

        // trạng thái trong modal
        //setPaymentStatus("success")

        // cập nhật invoice sang paid
        setInvoice({
            ...invoice,
            status: res.status as "paid"
        })

        // Đợi trạng thái hiện 1 chút rồi đóng modal
        setTimeout(() => setShowQR(false), 700)
    }

    return (
        <div className="bg-white shadow p-5 rounded-xl">
            <h3 className="font-bold text-lg text-gray-700 mb-3">
                Hóa đơn tháng {invoice.month}
            </h3>

            <div className="space-y-2 text-gray-700">
                {invoice.items.map((i, idx) => (
                    <p key={idx}>
                        {i.name}: {i.qty} × {i.price.toLocaleString()}đ ={" "}
                        <b>{(i.qty * i.price).toLocaleString()}đ</b>
                    </p>
                ))}
            </div>

            <p className="mt-3 text-lg font-bold text-gray-700">
                Tổng tiền: {invoice.total.toLocaleString()}đ
            </p>

            <p className="mt-1 text-gray-700">
                Trạng thái:{" "}
                {invoice.status === "paid" ? (
                    <span className="text-green-600 font-semibold">Đã thanh toán</span>
                ) : (
                    <span className="text-red-600 font-semibold">Chưa thanh toán</span>
                )}
            </p>

            {/* ⭐ Nút thanh toán luôn bật nếu chưa thanh toán */}
            {invoice.status === "unpaid" && (
                <button
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
                    onClick={() => {
                        setPaymentStatus("pending") // reset modal status
                        setShowQR(true)            // chỉ mở modal
                    }}
                >
                    Thanh toán
                </button>
            )}

            {/* ⭐ MODAL */}
            {showQR && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

                    <div className="bg-white p-6 rounded-xl shadow-xl w-[320px] text-center">

                        <h3 className="font-bold text-gray-800 mb-2">
                            Thanh toán bằng QR
                        </h3>

                        {/* Trạng thái trong modal */}
                        <p className="text-sm mb-3">
                            Trạng thái:{" "}
                            {paymentStatus === "pending" ? (
                                <span className="text-yellow-600 font-semibold">
                                    Chờ thanh toán...
                                </span>
                            ) : (
                                <span className="text-green-600 font-semibold">
                                    Đã thanh toán
                                </span>
                            )}
                        </p>

                        {/* QR Image */}
                        <div className="flex justify-center my-3">
                            <Image
                                src="/qr.png"
                                alt="QR Code"
                                width={240}
                                height={240}
                                className="rounded-lg shadow"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col gap-2 mt-4">

                            {/* Nút xác nhận thanh toán */}
                            {paymentStatus === "pending" && (
                                <button
                                    onClick={handlePay}
                                    className="bg-green-600 text-white py-2 rounded-lg"
                                >
                                    Tôi đã thanh toán
                                </button>
                            )}

                            {/* Đóng modal */}
                            <button
                                onClick={() => setShowQR(false)}
                                className="bg-gray-200 text-gray-700 py-2 rounded-lg"
                            >
                                Đóng
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
