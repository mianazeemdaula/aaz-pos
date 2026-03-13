import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
} from 'recharts';

interface StorageUtilizationChartProps {
    data: Array<{
        name: string;
        utilized: number;
        capacity: number;
        utilizationRate: number;
    }>;
    height?: number;
}

export function StorageUtilizationChart({
    data,
    height = 300,
}: StorageUtilizationChartProps) {
    // Color based on utilization rate
    const getColor = (rate: number) => {
        if (rate >= 90) return '#ef4444'; // red-500 - Critical
        if (rate >= 75) return '#f59e0b'; // amber-500 - Warning
        if (rate >= 50) return '#0d9488'; // primary-600 - Good
        return '#10b981'; // green-500 - Excellent
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {data.name}
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                                Utilized:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {data.utilized.toLocaleString()} kg
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                                Capacity:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {data.capacity.toLocaleString()} kg
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">
                                Utilization:
                            </span>
                            <span
                                className="font-bold text-sm"
                                style={{ color: getColor(data.utilizationRate) }}
                            >
                                {data.utilizationRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    className="dark:stroke-gray-700"
                />
                <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    tick={{ fontSize: 12 }}
                />
                <YAxis
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    tick={{ fontSize: 12 }}
                    label={{
                        value: 'Utilization %',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 12, fill: '#6b7280' },
                    }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="utilizationRate" radius={[8, 8, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColor(entry.utilizationRate)} />
                    ))}
                    <LabelList
                        dataKey="utilizationRate"
                        position="top"
                        formatter={(value: any) => `${Number(value).toFixed(0)}%`}
                        style={{ fontSize: 11, fontWeight: 600 }}
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

interface UtilizationGaugeProps {
    value: number;
    label: string;
    size?: number;
}

export function UtilizationGauge({
    value,
    label,
    size = 120,
}: UtilizationGaugeProps) {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    const getColor = () => {
        if (value >= 90) return '#ef4444'; // red-500
        if (value >= 75) return '#f59e0b'; // amber-500
        if (value >= 50) return '#0d9488'; // primary-600
        return '#10b981'; // green-500
    };

    const getStatus = () => {
        if (value >= 90) return 'Critical';
        if (value >= 75) return 'High';
        if (value >= 50) return 'Good';
        return 'Excellent';
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={45}
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={45}
                        stroke={getColor()}
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                        className="text-2xl font-bold"
                        style={{ color: getColor() }}
                    >
                        {value.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {getStatus()}
                    </span>
                </div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {label}
            </p>
        </div>
    );
}
