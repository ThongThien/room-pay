import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TooltipItem,
} from 'chart.js';
import { RevenueChartProps } from '../../types/dashboard';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
    const chartData = {
        labels: data.map(item => item.monthYear),
        datasets: [
            {
                label: 'Số tiền đã thanh toán',
                data: data.map(item => item.paidAmount),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Số tiền đang chờ',
                data: data.map(item => item.pendingAmount),
                borderColor: 'rgb(251, 191, 36)',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Số tiền quá hạn',
                data: data.map(item => item.overdueAmount),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: false,
                text: 'Doanh thu hàng tháng',
            },
            tooltip: {
                callbacks: {
                    label: function(context: TooltipItem<'line'>) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        label += (context.parsed.y || 0).toLocaleString('vi-VN') + ' triệu';
                        return label;
                    }
                }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value: number | string) {
                        return Number(value).toLocaleString('vi-VN') + ' triệu';
                    },
                },
            },
        },
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Doanh thu hàng tháng</h3>
            <Line data={chartData} options={options} />
        </div>
    );
};

export default RevenueChart;
