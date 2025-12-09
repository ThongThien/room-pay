import React from 'react';
import { useRouter } from 'next/navigation';

interface ErrorDisplayProps {
    error: string;
    onBack?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onBack }) => {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.push('/tenant/dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Lỗi</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                    onClick={handleBack}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                    Quay về Dashboard
                </button>
            </div>
        </div>
    );
};

export default ErrorDisplay;