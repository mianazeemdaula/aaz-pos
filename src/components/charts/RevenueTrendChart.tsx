import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface RevenueTrendChartProps {
    data: Array<{
        month: string;
        revenue: number;
        contracts?: number;
    }>;
    height?: number;
    showContracts?: boolean;
    variant?: 'line' | 'area';
}

export function RevenueTrendChart({
    data,
    height = 300,
    showContracts = false,
    variant = 'area',
}: RevenueTrendChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PKR',
            notation: 'compact',
            compactDisplay: 'short',
        }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {label}
                    </p>
                    {payload.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-gray-600 dark:text-gray-400">
                                {item.name}:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {item.name === 'Revenue'
                                    ? formatCurrency(item.value)
                                    : item.value}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            {variant === 'area' ? (
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorContracts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        className="dark:stroke-gray-700"
                    />
                    <XAxis
                        dataKey="month"
                        stroke="#6b7280"
                        className="dark:stroke-gray-400"
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        stroke="#6b7280"
                        className="dark:stroke-gray-400"
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        iconType="circle"
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#0d9488"
                        strokeWidth={2}
                        fill="url(#colorRevenue)"
                    />
                    {showContracts && (
                        <Area
                            type="monotone"
                            dataKey="contracts"
                            name="Active Contracts"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#colorContracts)"
                        />
                    )}
                </AreaChart>
            ) : (
                <LineChart data={data}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorContracts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        className="dark:stroke-gray-700"
                    />
                    <XAxis
                        dataKey="month"
                        stroke="#6b7280"
                        className="dark:stroke-gray-400"
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        stroke="#6b7280"
                        className="dark:stroke-gray-400"
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        iconType="circle"
                    />
                    <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#0d9488"
                        strokeWidth={2}
                        dot={{ fill: '#0d9488', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    {showContracts && (
                        <Line
                            type="monotone"
                            dataKey="contracts"
                            name="Active Contracts"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    )}
                </LineChart>
            )}
        </ResponsiveContainer>
    );
}
