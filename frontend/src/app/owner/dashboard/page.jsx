"use client"

import { useState, useMemo } from "react"

// =====================
// 1. MOCK DATA(FIX CỨNG)
// =====================

const ROOMS_DB = [
    { id: 101, name: "Căn bản 3", floor: 3, house: "Nhà trọ An Phú", tenant: "Nguyễn Văn A" },
    { id: 102, name: "Căn bản 4", floor: 4, house: "Nhà trọ An Phú", tenant: "Trần Thị B" },
    { id: 201, name: "Tiết kiệm 1", floor: 4, house: "Nhà trọ An Phú", tenant: "Lê Văn C" },
    { id: 202, name: "Tiết kiệm 2", floor: 5, house: "Nhà trọ An Phú", tenant: "Phạm Thị D" },
    { id: 301, name: "Luxury Mini", floor: 1, house: "Căn hộ Mini Bình Minh", tenant: "Hoàng Văn E" },
    { id: 302, name: "Máy lạnh Inveter", floor: 2, house: "Căn hộ Mini Bình Minh", tenant: "Đỗ Thị F" },
]

const READINGS_NOV = [
    { roomId: 101, prevElec: 1000, elec: 1100, prevWater: 40, water: 50, imgElec: "img_e_101.jpg", imgWater: "img_w_101.jpg" },
    { roomId: 102, prevElec: 2000, elec: 2150, prevWater: 50, water: 60, imgElec: "img_e_102.jpg", imgWater: "img_w_102.jpg" },
    { roomId: 201, prevElec: 1500, elec: 1550, prevWater: 42, water: 45, imgElec: "img_e_201.jpg", imgWater: "img_w_201.jpg" },
    { roomId: 202, prevElec: 3000, elec: 3100, prevWater: 65, water: 70, imgElec: "img_e_202.jpg", imgWater: "img_w_202.jpg" },
    { roomId: 302, prevElec: 4000, elec: 4200, prevWater: 78, water: 80, imgElec: "img_e_302.jpg", imgWater: "img_w_302.jpg" },
]

const INVOICES_NOV = [
    { id: 'INV_001', roomId: 101, status: 'PAID', paidAt: '20/11/2025' },
    { id: 'INV_002', roomId: 102, status: 'UNPAID', paidAt: null },
    { id: 'INV_003', roomId: 201, status: 'PAID', paidAt: '21/11/2025' },
    { id: 'INV_004', roomId: 202, status: 'PAID', paidAt: '22/11/2025' },
    { id: 'INV_005', roomId: 302, status: 'UNPAID', paidAt: null },
]

const INVOICE_ITEMS_DB = [
    { invoiceId: 'INV_001', name: 'Tiền phòng T11', amount: 3000000 },
    { invoiceId: 'INV_001', name: 'Tiền điện', amount: 350000 },
    { invoiceId: 'INV_001', name: 'Tiền nước', amount: 100000 },
    { invoiceId: 'INV_002', name: 'Tiền phòng T11', amount: 3200000 },
    { invoiceId: 'INV_002', name: 'Tiền điện', amount: 500000 },
    { invoiceId: 'INV_003', name: 'Tiền phòng T11', amount: 2800000 },
    { invoiceId: 'INV_004', name: 'Tiền phòng T11', amount: 3000000 },
    { invoiceId: 'INV_005', name: 'Tiền phòng T11', amount: 3500000 },
    { invoiceId: 'INV_005', name: 'Nợ cũ', amount: 500000 },
]

const getDataForMonth = () => {
    return ROOMS_DB.map(room => {
        const reading = READINGS_NOV.find(r => r.roomId === room.id)
        const invoice = INVOICES_NOV.find(i => i.roomId === room.id)
        const items = invoice ? INVOICE_ITEMS_DB.filter(it => it.invoiceId === invoice.id) : []
        const totalAmount = items.reduce((sum, it) => sum + it.amount, 0)

        return {
            ...room,
            hasReading: !!reading,
            elec: reading?.elec || 0,
            prevElec: reading?.prevElec || 0,
            water: reading?.water || 0,
            prevWater: reading?.prevWater || 0,
            imgElec: reading?.imgElec,
            imgWater: reading?.imgWater,
            hasInvoice: !!invoice,
            invoiceId: invoice?.id,
            isPaid: invoice?.status === 'PAID',
            paidAt: invoice?.paidAt,
            invoiceItems: items,
            totalAmount: totalAmount || 0
        }
    })
}

const MONTH_OPTIONS = [
    { id: 1, name: 'Tháng 11/2025 (Hiện tại)' },
    { id: 2, name: 'Tháng 10/2025' },
]

const STATS = { houses: 2, totalRooms: ROOMS_DB.length, rentedRooms: ROOMS_DB.length }

// =====================
// MAIN COMPONENT
// =====================
export default function OwnerDashboard() {
    const [selectedMonthId, setSelectedMonthId] = useState(1)
    
    // modalType: 'list_readings' | 'list_bills' | 'list_paid' | 'list_unpaid' | 'list_missing_readings' | 'detail_reading' | 'detail_bill'
    const [modalType, setModalType] = useState(null)
    const [selectedDetail, setSelectedDetail] = useState(null)

    const roomData = useMemo(() => getDataForMonth(selectedMonthId), [selectedMonthId])
    const currentMonthName = MONTH_OPTIONS.find(m => m.id === selectedMonthId)?.name
    const isCurrentMonth = selectedMonthId === 1

    const financial = useMemo(() => {
        const totalReceivable = roomData.reduce((sum, r) => sum + r.totalAmount, 0)
        const totalCollected = roomData.filter(r => r.isPaid).reduce((sum, r) => sum + r.totalAmount, 0)
        return {
            totalReceivable,
            totalCollected,
            totalRemaining: totalReceivable - totalCollected
        }
    }, [roomData])

    const openList = (type) => {
        setModalType(type)
        setSelectedDetail(null)
    }

    const openDetail = (item) => {
        setSelectedDetail(item)
        if (modalType === 'list_readings') {
            setModalType('detail_reading')
        } else {
            setModalType('detail_bill')
        }
    }

    const backToList = () => {
        if (modalType === 'detail_reading') setModalType('list_readings')
        else setModalType('list_bills')
        setSelectedDetail(null)
    }

    const closeAll = () => {
        setModalType(null)
        setSelectedDetail(null)
    }

    return (
        <div className="h-full flex flex-col gap-6 text-gray-700 bg-gray-50 p-4">
            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                <div className="col-span-12 md:col-span-3 flex flex-col gap-6 overflow-y-auto">
                    <StatCard stats={STATS} />
                    <MonthList data={MONTH_OPTIONS} selectedId={selectedMonthId} onSelect={setSelectedMonthId} />
                </div>

                <div className="col-span-12 md:col-span-9 flex flex-col gap-6 overflow-y-auto">
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[300px] flex flex-col justify-between">
                        <DashboardContent 
                            monthName={currentMonthName}
                            isCurrent={isCurrentMonth}
                            data={roomData}
                            financial={financial}
                            onOpenList={openList} 
                        />
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {['list_readings', 'list_bills', 'list_paid', 'list_unpaid', 'list_missing_readings'].includes(modalType) && (
                <ListModal 
                    type={modalType} 
                    data={roomData} 
                    onClose={closeAll} 
                    onDetail={openDetail}
                />
            )}

            {modalType === 'detail_reading' && selectedDetail && (
                <ReadingDetailModal 
                    room={selectedDetail} 
                    onBack={backToList} 
                />
            )}

            {modalType === 'detail_bill' && selectedDetail && (
                <BillDetailModal 
                    room={selectedDetail} 
                    onBack={backToList} 
                />
            )}
        </div>
    )
}

// =====================
// DASHBOARD CONTENT
// =====================
function DashboardContent({ monthName, isCurrent, data, financial, onOpenList }) {
    const missingReadingCount = data.filter(r => !r.hasReading).length
    const hasReadingCount = data.length - missingReadingCount
    const unpaidCount = data.filter(r => r.hasInvoice && !r.isPaid).length
    const paidCount = data.filter(r => r.isPaid).length

    return (
        <>
            <div>
                <h2 className="text-xl font-bold text-center mb-8 uppercase tracking-wide">
                    Quản lý {monthName}
                </h2>
                
                {!isCurrent && missingReadingCount > 0 && (
                    <div 
                        onClick={() => onOpenList('list_missing_readings')}
                        className="mb-6 border p-3 rounded-lg flex justify-between items-center cursor-pointer"
                    >
                        <span>Phòng chưa nộp chỉ số tháng này</span>
                        <span className="underline text-sm font-bold">Xem danh sách</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* SECTION LỚN: CHỈ SỐ VÀ HÓA ĐƠN */}
                    <div onClick={() => onOpenList('list_readings')} className="border rounded-xl p-5 cursor-pointer hover:bg-blue-50 text-center transition group relative">
                        <h3 className="font-bold text-lg mb-2">Quản lý điện nước phòng trọ</h3>
                        <div className="text-sm text-gray-600 bg-gray-100 py-2 rounded-lg border">
                            <p>Đã nộp: <b className="text-green-600">{hasReadingCount}</b></p>
                            <p>Chưa nộp: <b className="text-red-600">{missingReadingCount}</b></p>
                        </div>
                    </div>

                    <div onClick={() => onOpenList('list_bills')} className="border rounded-xl p-5 cursor-pointer hover:bg-blue-50 text-center transition group relative">
                        <h3 className="font-bold text-lg mb-2">Hóa Đơn</h3>
                        <div className="text-sm text-gray-600 bg-gray-100 py-2 rounded-lg border">
                            <p>Đã thanh toán: <b className="text-green-600">{paidCount}</b></p>
                            <p>Chưa thanh toán: <b className="text-red-600">{unpaidCount}</b></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TỔNG KẾT*/}
            <div className="mt-4 pt-6 border-t-2 border-dashed border-gray-200 bg-gray-50 -mx-8 -mb-8 p-8 rounded-b-xl">
                <MoneyRow label="1. Tổng phải thu" amount={financial.totalReceivable} color="gray" />
                <MoneyRow label="2. Tổng đã thu được" amount={financial.totalCollected} color="green" onClick={() => onOpenList('list_paid')} note="(Nhấn để xem danh sách)" />
                <MoneyRow 
                    label={isCurrent ? "3. Còn lại phải thu" : "3. Hóa đơn chưa thanh toán"} 
                    amount={financial.totalRemaining} 
                    color="red" 
                    onClick={() => onOpenList('list_unpaid')} 
                    note="(Nhấn để xem & Nhắc thanh toán)" 
                />
            </div>
        </>
    )
}

// =====================
// LIST MODAL
// =====================
function ListModal({ type, data, onClose, onDetail }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')

    let config = { title: '', checkKey: '', doneText: '', pendingText: '', remindText: '', isFixedList: false, showDetailCol: true }

    switch(type) {
        // ==> CASE TỪ NÚT TO (CÓ CHI TIẾT)
        case 'list_readings':
            config = { title: 'Quản lý điện nước phòng trọ', checkKey: 'hasReading', doneText: 'Đã nộp', pendingText: 'Chưa nộp', remindText: 'nhắc nộp ảnh', showDetailCol: true }
            break
        case 'list_bills':
            config = { title: 'Danh sách Hóa Đơn', checkKey: 'isPaid', doneText: 'Đã TT', pendingText: 'Chưa TT', remindText: 'nhắc thanh toán', showDetailCol: true }
            break
        
        // ==> CASE TỪ TỔNG KẾT (KHÔNG CHI TIẾT)
        case 'list_paid':
            config = { title: 'Danh sách Đã Thanh Toán', checkKey: 'isPaid', doneText: 'Đã TT', pendingText: 'Chưa TT', remindText: '', isFixedList: true, showDetailCol: false } // <--- Ẩn chi tiết
            break
        case 'list_unpaid':
            config = { title: 'Danh sách Chưa Thanh Toán', checkKey: 'isPaid', doneText: 'Đã TT', pendingText: 'Chưa TT', remindText: 'Nhắc thanh toán', isFixedList: true, showDetailCol: false } // <--- Ẩn chi tiết
            break
        case 'list_missing_readings':
            config = { title: 'Danh sách Thiếu Chỉ Số', checkKey: 'hasReading', doneText: 'Đã nộp', pendingText: 'Chưa nộp', remindText: 'Nhắc nộp ảnh', isFixedList: true, showDetailCol: false } // <--- Ẩn chi tiết
            break
    }

    const filteredData = data.filter(room => {
        const matchSearch = `${room.name} ${room.house} ${room.tenant}`.toLowerCase().includes(searchTerm.toLowerCase())
        let matchFilter = true
        
        if (type === 'list_paid') matchFilter = room.isPaid
        else if (type === 'list_unpaid') matchFilter = room.hasInvoice && !room.isPaid
        else if (type === 'list_missing_readings') matchFilter = !room.hasReading
        else if (type === 'list_bills') matchFilter = room.hasInvoice
        else if (filterStatus !== 'all') {
            const isDone = room[config.checkKey]
            matchFilter = filterStatus === 'done' ? isDone : !isDone
        }
        return matchSearch && matchFilter
    })

    const pendingCount = filteredData.filter(r => !r[config.checkKey]).length

    return (
        <ModalWrapper onClose={onClose} width="max-w-5xl">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-xl font-bold uppercase">{config.title}</h3>
                <button onClick={onClose} className="text-2xl font-bold text-gray-400 hover:text-black">&times;</button>
            </div>

            <div className="flex gap-4 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1 flex items-center bg-white border rounded px-3">
                    <input 
                        placeholder="Tìm theo phòng, nhà, người thuê..." 
                        className="flex-1 py-2 outline-none text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {!config.isFixedList && (
                    <select className="bg-white border rounded px-3 py-2 text-sm outline-none cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">Tất cả trạng thái</option>
                        <option value="done">{config.doneText}</option>
                        <option value="pending">{config.pendingText}</option>
                    </select>
                )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-100 sticky top-0 z-10 text-gray-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-3 border-b text-center w-12">STT</th>
                            <th className="p-3 border-b w-20">Nhà</th>
                            <th className="p-3 border-b w-20">Phòng</th>
                            <th className="p-3 border-b text-center w-16">Tầng</th>
                            <th className="p-3 border-b">Người thuê</th>
                            <th className="p-3 border-b text-center w-32">Trạng thái</th>
                            {config.showDetailCol && <th className="p-3 border-b text-center w-32">Hành động</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredData.length > 0 ? filteredData.map((room, idx) => {
                            const isDone = room[config.checkKey]
                            return (
                                <tr key={room.id} className={`hover:bg-blue-50 transition-colors ${!isDone ? 'bg-red-50/30' : ''}`}>
                                    <td className="p-3 text-center">{idx + 1}</td>
                                    <td className="p-3">{room.house}</td>
                                    <td className="p-3 font-bold text-blue-600">{room.name}</td>
                                    <td className="p-3 text-center">{room.floor}</td>
                                    <td className="p-3">{room.tenant}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${isDone ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {isDone ? config.doneText : config.pendingText}
                                        </span>
                                    </td>
                                    
                                    {/*CHỈ HIỆN CỘT CHI TIẾT NẾU LÀ DANH SÁCH CHÍNH (READINGS HOẶC BILLS)*/}
                                    {config.showDetailCol && (
                                        <td className="p-3 text-center">
                                            {(type === 'list_readings' && !room.hasReading) || (type !== 'list_readings' && !room.hasInvoice) ? (
                                                <span className="text-gray-400 text-xs italic">-</span>
                                            ) : (
                                                <button 
                                                    onClick={() => onDetail(room)}
                                                    className="text-blue-600 hover:text-blue-800 underline text-xs font-bold"
                                                >
                                                    Xem chi tiết
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            )
                        }) : <tr><td colSpan="7" className="text-center p-6 text-gray-400">Không có dữ liệu</td></tr>}
                    </tbody>
                </table>
            </div>

            {pendingCount > 0 && config.remindText && (
                <div className="mt-4 pt-4 border-t text-right">
                    <button className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-red-700 shadow-md flex items-center gap-2 ml-auto">
                        Gửi thông báo {config.remindText}
                    </button>
                </div>
            )}
        </ModalWrapper>
    )
}

// =====================
// CHI TIẾT CHỈ SỐ
// =====================
function ReadingDetailModal({ room, onBack }) {
    return (
        <ModalWrapper onClose={onBack}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h3 className="font-bold text-lg">Chi tiết Điện/Nước - {room.name}</h3>
                <button onClick={onBack} className="text-gray-500 hover:text-black text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="border border-gray-300 rounded p-4 bg-gray-50">
                    <h4 className="font-bold text-gray-500 mb-3 border-b pb-1 uppercase text-xs">Tháng trước</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span>⚡ Điện:</span>
                            <span className="font-mono font-bold">{room.prevElec}</span>
                            {room.imgElec && <button className="text-xs text-blue-600 underline">Xem ảnh</button>}
                        </div>
                        <div className="flex justify-between">
                            <span>💧 Nước:</span>
                            <span className="font-mono font-bold">{room.prevWater}</span>
                            {room.imgWater && <button className="text-xs text-blue-600 underline">Xem ảnh</button>}
                        </div>
                    </div>
                </div>
                <div className="border border-blue-300 rounded p-4 bg-white">
                    <h4 className="font-bold text-blue-700 mb-3 border-b pb-1 uppercase text-xs">Tháng này</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span>⚡ Điện:</span>
                            <span className="font-mono font-bold block">{room.elec}</span>
                            {room.imgElec && <button className="text-xs text-blue-600 underline">Xem ảnh</button>}
                            
                        </div>
                        <div className="flex justify-between items-center">
                            <span>💧 Nước:</span>                 
                            <span className="font-mono font-bold block">{room.water}</span>
                            {room.imgWater && <button className="text-xs text-blue-600 underline">Xem ảnh</button>}
                        </div>
                    </div>
                </div>
            </div>
        </ModalWrapper>
    )
}

// =====================
// CHI TIẾT HÓA ĐƠN
// =====================
function BillDetailModal({ room, onBack }) {
    const total = room.invoiceItems.reduce((sum, item) => sum + item.amount, 0)

    return (
        <ModalWrapper onClose={onBack}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h3 className="font-bold text-lg">Chi tiết Hóa đơn</h3>
                <button onClick={onBack} className="text-gray-500 hover:text-black text-xl">✕</button>
            </div>

            <div className="bg-gray-100 p-3 rounded mb-4 text-sm text-gray-700">
                <div className="flex justify-between mb-1"><span>Mã HĐ:</span><span className="font-mono font-bold">{room.invoiceId}</span></div>
                <div className="flex justify-between mb-1"><span>Phòng:</span><span>{room.name} ({room.house})</span></div>
                <div className="flex justify-between"><span>Trạng thái:</span>{room.isPaid ? <span className="text-green-600 font-bold">Đã thanh toán</span> : <span className="text-red-600 font-bold">Chưa thanh toán</span>}</div>
            </div>

            <div className="border rounded overflow-hidden mb-4">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr><th className="p-2 text-left">Khoản mục</th><th className="p-2 text-right">Số tiền</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {room.invoiceItems.map((item, idx) => (
                            <tr key={idx}><td className="p-2">{item.name}</td><td className="p-2 text-right font-mono">{item.amount.toLocaleString()}</td></tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t">
                        <tr><td className="p-2">Tổng cộng</td><td className="p-2 text-right">{total.toLocaleString()}</td></tr>
                    </tfoot>
                </table>
            </div>

            {!room.isPaid && (
                <button className="w-full py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 text-sm">Gửi thông báo thanh toán</button>
            )}
        </ModalWrapper>
    )
}

// =====================
// HELPER COMPONENTS
// =====================

function StatCard({ stats }) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold mb-4 border-b pb-2">Tổng quan</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2"><span>Tổng số nhà</span> <b>: {stats.houses}</b></div>
                <div className="flex justify-between border-b border-gray-100 pb-2"><span>Tổng số phòng</span> <b>: {stats.totalRooms}</b></div>
                <div className="flex justify-between"><span>Đang thuê</span> <b className="text-green-600">: {stats.rentedRooms}</b></div>
            </div>
        </div>
    )
}

function MonthList({ data, selectedId, onSelect }) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex-1">
            <h3 className="font-bold mb-4 border-b pb-2">Danh sách tháng</h3>
            <div className="flex flex-col gap-2">
                {data.map(m => (
                    <button key={m.id} onClick={() => onSelect(m.id)} className={`p-3 text-left rounded-lg text-sm font-medium border transition-colors ${selectedId === m.id ? 'bg-gray-800 text-white' : 'hover:bg-gray-50'}`}>
                        {m.name}
                    </button>
                ))}
            </div>
        </div>
    )
}

function MoneyRow({ label, amount, color, onClick, note }) {
    const colors = { gray: 'text-gray-700', green: 'text-green-600', red: 'text-red-600' }
    return (
        <div 
            onClick={onClick} 
            className={`flex justify-between items-center mb-3 p-2 rounded-lg transition ${onClick ? 'cursor-pointer hover:bg-white border border-transparent hover:border-gray-200 shadow-sm' : ''}`}
        >
            <div className="flex flex-col">
                <span className="font-bold text-lg">{label}:</span>
                {note && <span className="text-xs text-gray-400 font-normal">{note}</span>}
            </div>
            <span className={`font-bold text-2xl ${colors[color]}`}>{amount.toLocaleString()} đ</span>
        </div>
    )
}

function ModalWrapper({ children, width = "max-w-lg"}) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white p-6 rounded-xl shadow-lg w-full ${width} flex flex-col max-h-[90vh]`}>
                {children}
            </div>
        </div>
    )
}