import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { OccupancyChartProps } from '../../types/dashboard';

ChartJS.register(ArcElement, Tooltip, Legend);

const OccupancyChart: React.FC<OccupancyChartProps> = ({ occupied, vacant }) => {
    const data = {
        labels: ['Occupied', 'Vacant'],
        datasets: [
            {
                data: [occupied, vacant],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(156, 163, 175, 0.8)',
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(156, 163, 175)',
                ],
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
            title: {
                display: true,
                text: 'Room Occupancy',
            },
        },
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Occupancy Overview</h3>
            <Doughnut data={data} options={options} />
        </div>
    );
};

export default OccupancyChart;