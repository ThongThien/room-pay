interface AlertModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'success' | 'warning';
    onClose: () => void;
}

export default function AlertModal({ isOpen, title, message, type, onClose }: AlertModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="text-center">
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
                        type === 'error' ? 'bg-red-100' : 
                        type === 'warning' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                         {type === 'error' && <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                         {type === 'warning' && <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                         {type === 'success' && <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-500">{message}</p>
                </div>
                <div className="mt-6">
                    <button onClick={onClose} className={`w-full px-4 py-2 font-medium rounded-lg text-white transition ${
                         type === 'error' ? 'bg-red-600 hover:bg-red-700' : 
                         type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'
                    }`}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}