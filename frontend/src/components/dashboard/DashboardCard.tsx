import React from 'react';
import { DashboardCardProps } from '../../types/dashboard';

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, apiEndpoint, color, onClick, isClickable = false }) => {
    let borderColor = 'border-gray-300';
    let textColor = 'text-gray-800';
    let apiBgColor = 'bg-gray-100';

    switch (color) {
        case 'green':
            borderColor = 'border-green-500';
            textColor = 'text-green-700';
            apiBgColor = 'bg-green-50';
            break;
        case 'red':
            borderColor = 'border-red-500';
            textColor = 'text-red-700';
            apiBgColor = 'bg-red-50';
            break;
        case 'yellow':
            borderColor = 'border-yellow-600';
            textColor = 'text-yellow-700';
            apiBgColor = 'bg-yellow-50';
            break;
        case 'default':
        default:
            borderColor = 'border-indigo-400';
            textColor = 'text-gray-800';
            apiBgColor = 'bg-indigo-50';
            break;
    }

    const baseClasses = `bg-white p-4 rounded-xl shadow-lg border-l-4 ${borderColor} flex flex-col justify-between transition-all duration-300`;
    const clickableClasses = isClickable ? 'cursor-pointer hover:shadow-xl' : '';

    return (
        <div
            className={`${baseClasses} ${clickableClasses}`}
            onClick={onClick}
        >
            <div className="text-sm font-medium text-gray-700 mb-2 leading-tight">{title}</div>
            <div className={`text-2xl font-extrabold my-1 ${textColor}`}>{value}</div>
            {isClickable && <div className="text-xs font-semibold text-blue-500 mt-1">Click để xem chi tiết</div>}
        </div>
    );
};

export default DashboardCard;