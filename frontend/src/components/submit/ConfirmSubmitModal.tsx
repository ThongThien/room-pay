interface ConfirmSubmitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    hasWarning: boolean;
    isHighElec: boolean;
    isHighWater: boolean;
    elecUsage: number;
    waterUsage: number;
    limits: { elec: number; water: number };
}

export default function ConfirmSubmitModal({ isOpen, onClose, onConfirm, hasWarning, isHighElec, isHighWater, elecUsage, waterUsage}: ConfirmSubmitModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="text-center">
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${hasWarning ? "bg-yellow-100" : "bg-green-100"}`}>
                        {hasWarning ? (
                             <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        ) : (
                             <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {hasWarning ? "Cảnh báo chỉ số cao!" : "Xác nhận nộp chỉ số?"}
                    </h3>
                    
                    {hasWarning ? (
                        <div className="bg-yellow-50 text-left p-3 rounded-lg border border-yellow-200 text-sm mb-2">
                            <p className="font-semibold text-yellow-800 mb-1">Phát hiện tiêu thụ bất thường:</p>
                            <ul className="list-disc list-inside text-yellow-700 space-y-1">
                                {isHighElec && <li>Điện: <b>{elecUsage} kWh</b></li>}
                                {isHighWater && <li>Nước: <b>{waterUsage} m³</b></li>}
                            </ul>
                            <p className="mt-2 text-xs text-gray-500 italic">Vui lòng kiểm tra kỹ lại. Nếu đúng, bấm nút gửi.</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Vui lòng xác nhận đúng chỉ số trước khi gửi. Hành động này không thể hoàn tác.</p>
                    )}
                </div>
                
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition">Kiểm tra lại</button>
                    <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition ${hasWarning ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}>
                        {hasWarning ? "Vẫn gửi" : "Xác nhận"}
                    </button>
                </div>
            </div>
        </div>
    );
}