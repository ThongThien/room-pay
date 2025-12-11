import React from 'react';

const SuccessDisplay: React.FC = () => {
    return (
        <div className="text-center py-8">
            <div className="mb-4 flex justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center">
                    <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">
                Thanh toán thành công!
            </h3>
            <p className="text-gray-600 mb-4">
                Đang chuyển về trang chủ...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        </div>
    );
};

export default SuccessDisplay;