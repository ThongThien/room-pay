"use client"

import { useState } from "react"

const STATS = {
    houses: 2,
    totalRooms: 12,
    rentedRooms: 10
}

const MONTHLY_DATA = [
    {
        id: 1,
        name: 'Tháng 11/2025 (Hiện tại)',
        rdings: [101, 102, 103, 104],
        unrdings: [107, 108, 109, 110],
        invoiced: [101, 102, 103, 104, 107, 108],
        late: [],
        totalRevenue: '15.000.000',
        remaining: '5.000.000'
    },
    {
        id: 2,
        name: 'Tháng 10/2025',
        rdings: [101, 102, 105, 103],
        unrdings: [109, 110],
        invoiced: [101, 102, 103, 104, 105],
        late: [109, 110],
        totalRevenue: '22.000.000',
        remaining: '2.000.000'
    },
]
// =====================
export default function OwnerDashboard() {
    const [selectedMonthId, setSelectedMonthId] = useState(1)
    
    // State Modal
    const [modalType, setModalType] = useState(null)
    const [listData, setListData] = useState([])
    const [listTitle, setListTitle] = useState('')
    const [listKey, setListKey] = useState('')
    const [selectedRoomId, setSelectedRoomId] = useState(null)

    const currentMonth = MONTHLY_DATA.find(m => m.id === selectedMonthId) || MONTHLY_DATA[0]

    //ACTIONS
    const openList = (key) => {
        setListKey(key)
        let data = []
        let title = ''

        if (key === 'invoiced') {
            setModalType('invoice_table')
            return
        }

        switch (key) {
            case 'rdings': 
                data = currentMonth.rdings
                title = 'Danh sách phòng đã nộp chỉ số'
                break
            case 'unrdings': 
                data = currentMonth.unrdings
                title = 'Danh sách phòng chưa nộp chỉ số'
                break
            case 'revenue_paid': 
                data = currentMonth.rdings
                title = 'Danh sách phòng đã đóng tiền'
                break
            case 'revenue_unpaid': 
                data = currentMonth.unrdings
                title = 'Danh sách phòng chưa đóng tiền'
                break
            case 'late': 
                data = currentMonth.late
                title = 'Danh sách phòng nộp trễ'
                break
        }
        setListData(data)
        setListTitle(title)
        setModalType('list')
    }

    const openDetail = (roomId) => {
        if (listKey === 'invoiced' || listKey === 'revenue_paid' || listKey === 'revenue_unpaid') {
            setSelectedRoomId(roomId)
            setModalType('bill_detail')
        } else if (listKey === 'rdings') {
            setSelectedRoomId(roomId)
            setModalType('room_detail')
        }
    }

    const closeAll = () => setModalType(null)

    return (
        <div className="h-full flex flex-col gap-6 font-sans text-gray-700">
            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                
                <div className="col-span-12 md:col-span-3 flex flex-col gap-6 overflow-y-auto">
                    <StatCard stats={STATS} />
                    <MonthList 
                        data={MONTHLY_DATA} 
                        selectedId={selectedMonthId} 
                        onSelect={setSelectedMonthId} 
                    />
                </div>

                <div className="col-span-12 md:col-span-9 flex flex-col gap-6 overflow-y-auto">
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[300px] flex flex-col justify-between">
                        <DashboardContent 
                            monthData={currentMonth} 
                            onOpenList={openList} 
                        />
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {modalType === 'list' && (
                <ListModal 
                    title={listTitle} 
                    data={listData} 
                    listKey={listKey} 
                    onClose={closeAll} 
                    onDetail={openDetail} 
                />
            )}

            {modalType === 'invoice_table' && (
                <InvoiceTableModal 
                    monthData={currentMonth} 
                    onClose={closeAll} 
                    onDetail={(id) => {
                        setSelectedRoomId(id)
                        setModalType('bill_detail')
                    }} 
                />
            )}

            {modalType === 'bill_detail' && (
                <BillDetailModal 
                    roomId={selectedRoomId} 
                    monthData={currentMonth}
                    onBack={() => setModalType(listKey === 'invoiced' ? 'invoice_table' : 'list')} 
                />
            )}

            {modalType === 'room_detail' && (
                <RoomDetailModal 
                    roomId={selectedRoomId} 
                    onBack={() => setModalType('list')} 
                />
            )}
        </div>
    )
}


// =====================
// SUB-COMPONENTS
// =====================

function StatCard({ stats }) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold mb-4 border-b pb-2">Tổng quan</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span>Tổng số nhà</span> <b>: {stats.houses}</b>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span>Tổng số phòng</span> <b>: {stats.totalRooms}</b>
                </div>
                <div className="flex justify-between">
                    <span>Đang thuê</span> <b className="text-green-600">: {stats.rentedRooms}</b>
                </div>
            </div>
        </div>
    )
}

function MonthList({ data, selectedId, onSelect }) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex-1">
            <h3 className="font-bold mb-4 border-b pb-2">Danh sách doanh thu</h3>
            <div className="flex gap-2 mb-4">
                <input className="border rounded p-2 w-1/2 text-sm outline-none" placeholder="Tháng" />
                <input className="border rounded p-2 w-1/2 text-sm outline-none" placeholder="Năm" />
            </div>
            <div className="flex flex-col gap-2">
                {data.map(m => (
                    <button 
                        key={m.id} 
                        onClick={() => onSelect(m.id)}
                        className={`p-3 text-left rounded-lg text-sm font-medium border transition-colors ${
                            selectedId === m.id ? 'bg-gray-800 text-white' : 'hover:bg-gray-50'
                        }`}
                    >
                        {m.name}
                    </button>
                ))}
            </div>
        </div>
    )
}

function DashboardContent({ monthData, onOpenList }) {
    return (
        <>
            <div>
                <h2 className="text-xl font-bold text-center mb-8 uppercase tracking-wide">
                    Thông tin doanh thu {monthData.name}
                </h2>
                <div className="space-y-6">
                    <RowItem label="Phòng đã nộp chỉ số" onClick={() => onOpenList('rdings')} count={monthData.rdings.length} color="green" />
                    <RowItem label="Phòng chưa nộp chỉ số" onClick={() => onOpenList('unrdings')} count={monthData.unrdings.length} color="red" />
                    <RowItem label="Hóa đơn tháng này" onClick={() => onOpenList('invoiced')} count={monthData.invoiced.length} color="blue" isBill />
                    
                    {monthData.late.length > 0 && (
                        <RowItem label="Phòng nộp trễ" onClick={() => onOpenList('late')} count={monthData.late.length} color="orange" />
                    )}
                </div>
            </div>

            <div className="mt-10 pt-6 border-t-2 border-dashed border-gray-200 bg-gray-50 -mx-8 -mb-8 p-8 rounded-b-xl">
                <MoneyRow label="Tổng thu được" amount={monthData.totalRevenue} color="blue" onClick={() => onOpenList('revenue_paid')} />
                <MoneyRow label="Còn lại phải thu" amount={monthData.remaining} color="red" onClick={() => onOpenList('revenue_unpaid')} />
            </div>
        </>
    )
}

function RowItem({ label, onClick, count, color, isBill }) {
    const colorClasses = {
        green: 'bg-green-100 text-green-700 hover:bg-green-200',
        red: 'bg-red-100 text-red-700 hover:bg-red-200',
        blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
        orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
    }

    return (
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <span className="font-medium text-lg">{label}:</span>
            <button onClick={onClick} className={`px-5 py-2 rounded-lg font-bold transition shadow-sm ${colorClasses[color]}`}>
                {count} {isBill ? 'hóa đơn' : 'phòng'}
            </button>
        </div>
    )
}

function MoneyRow({ label, amount, color, onClick }) {
    return (
        <div onClick={onClick} className="flex justify-between items-center mb-3 cursor-pointer hover:bg-white p-2 rounded-lg transition group">
            <span className={`font-bold text-xl group-hover:text-${color}-700`}>{label}:</span>
            <span className={`font-bold text-3xl text-${color}-600`}>{amount} đ</span>
        </div>
    )
}

// =====================
// MODALS
// =====================

function ListModal({ title, data, listKey, onClose, onDetail }) {
    const isClickable = listKey === 'rdings' || listKey === 'revenue_paid'

    return (
        <ModalWrapper onClose={onClose}>
            <h3 className="text-lg font-bold mb-4 text-center border-b pb-3">{title}</h3>
            {data.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-1">
                    {data.map(id => (
                        <button 
                            key={id} 
                            onClick={() => onDetail(id)}
                            disabled={!isClickable}
                            className={`font-bold py-3 rounded-lg shadow-sm border border-gray-200 transition 
                                ${isClickable 
                                    ? 'bg-white hover:bg-gray-800 hover:text-white cursor-pointer' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'
                                }`}
                        >
                            P.{id}
                        </button>
                    ))}
                </div>
            ) : <p className="text-center py-4 text-gray-500">Không có dữ liệu</p>}
            <button onClick={onClose} className="mt-6 w-full py-2 bg-gray-100 font-bold rounded-lg hover:bg-gray-200">Đóng</button>
        </ModalWrapper>
    )
}

function InvoiceTableModal({ monthData, onClose, onDetail }) {
    const list = [
        ...monthData.rdings.map(id => ({ id, status: 'paid', amount: '3.500.000' })),
        ...monthData.unrdings.map(id => ({ id, status: 'unpaid', amount: '3.500.000' }))
    ].sort((a,b) => a.id - b.id)

    return (
        <ModalWrapper onClose={onClose} width="max-w-2xl">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-xl font-bold">Danh sách hóa đơn chi tiết</h3>
                <button onClick={onClose} className="text-2xl font-bold">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 max-h-[60vh]">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr><th className="p-3">Phòng</th><th className="p-3">Số tiền</th><th className="p-3">Trạng thái</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {list.map(item => (
                            <tr key={item.id} onClick={() => onDetail(item.id)} className="hover:bg-blue-50 cursor-pointer">
                                <td className="p-3 font-bold">P.{item.id}</td>
                                <td className="p-3 font-mono">{item.amount} đ</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 pt-4 border-t">
                <button className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 shadow-lg flex justify-center items-center gap-2">
                    Nhắc thanh toán (Gửi cho {monthData.unrdings.length} phòng)
                </button>
            </div>
        </ModalWrapper>
    )
}

function BillDetailModal({ roomId, monthData, onBack }) {
    const isPaid = monthData.rdings.includes(roomId)

    return (
        <ModalWrapper onClose={onBack}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Hóa Đơn P.{roomId}</h3>
                <button onClick={onBack} className="text-gray-500 font-bold px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Quay lại</button>
            </div>
            
            <div className="w-full h-80 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-400 border-2 border-dashed border-blue-200 mb-4">
                <span className="text-sm font-medium">Hình ảnh hóa đơn chi tiết</span>
            </div>

            {!isPaid ? (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <button className="w-full bg-white border-2 border-red-500 text-red-600 py-3 rounded-lg font-bold hover:bg-red-50 flex justify-center items-center gap-2">
                        Nhắc thanh toán (Chỉ P.{roomId})
                    </button>
                </div>
            ) : (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <span className="text-green-600 font-bold text-lg">Đã thanh toán</span>
                </div>
            )}
        </ModalWrapper>
    )
}

function RoomDetailModal({ roomId, onBack }) {
    return (
        <ModalWrapper onClose={onBack}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Chỉ số P.{roomId}</h3>
                <button onClick={onBack} className="text-gray-500 font-bold px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Quay lại</button>
            </div>
            <div className="flex gap-5 flex-col sm:flex-row">
                <div className="w-full sm:w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 border-2 border-dashed">
                    <span className="text-xs">Ảnh Đồng Hồ</span>
                </div>
                <div className="flex-1 space-y-4">
                    <div><label className="block text-xs font-bold mb-1">ĐIỆN:</label><input readOnly value={1200} className="w-full border bg-gray-50 rounded px-3 py-2" /></div>
                    <div><label className="block text-xs font-bold mb-1">NƯỚC:</label><input readOnly value={45} className="w-full border bg-gray-50 rounded px-3 py-2" /></div>
                </div>
            </div>
        </ModalWrapper>
    )
}

function ModalWrapper({ children, width = "max-w-lg" }) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
            <div className={`bg-white p-6 rounded-xl shadow-2xl w-full ${width}`}>
                {children}
            </div>
        </div>
    )
}