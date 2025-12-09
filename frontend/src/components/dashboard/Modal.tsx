import React from 'react';
import { ModalProps } from '../../types/dashboard';

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center font-sans p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-500 hover:text-gray-700 text-3xl font-light hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;