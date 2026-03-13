import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';

interface StorePerformanceChartProps {
    data: Array<{
        name: string;
        value: number;
        color?: string;
    }>;
    height?: number;
    variant?: 'pie' | 'donut';
    valueFormatter?: (value: number) => string;
}

const COLORS = [
    '#0d9488', // primary-600
    '#3b82f6', // blue-500
    '#8b5cf6', // purple-500
    '#ec4899', // pink-500
    '#f59e0b', // amber-500
    '#10b981', // green-500
    '#ef4444', // red-500
    '#6366f1', // indigo-500
];

export function StorePerformanceChart({
    data,
    height = 300,
    variant = 'donut',
    valueFormatter = (value) => value.toLocaleString(),
}: StorePerformanceChartProps) {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const total = payload[0].payload.total || 0;
            const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0.0';

            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {data.name}
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Value:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {valueFormatter(data.value)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                                Percentage:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {percentage}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const renderCustomLabel = ({
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        percent,
    }: any) => {
        if (percent < 0.05) return null; // Don't show label if less than 5%

        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-xs font-semibold drop-shadow-lg"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // Calculate total for percentage
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const dataWithTotal = data.map((item) => ({ ...item, total }));

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={dataWithTotal}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={variant === 'donut' ? 100 : 120}
                    innerRadius={variant === 'donut' ? 60 : 0}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                >
                    {dataWithTotal.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

interface StoreComparisonChartProps {
    data: Array<{
        name: string;
        activeContracts: number;
        revenue: number;
        utilization: number;
    }>;
    height?: number;
}

export function StoreComparisonChart({
    data,
    height = 300,
}: StoreComparisonChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PKR',
            notation: 'compact',
            compactDisplay: 'short',
        }).format(value);
    };

    // Prepare data for multiple metrics
    const contractsData = data.map((store) => ({
        name: store.name,
        value: store.activeContracts,
    }));

    const revenueData = data.map((store) => ({
        name: store.name,
        value: store.revenue,
    }));

    const utilizationData = data.map((store) => ({
        name: store.name,
        value: store.utilization,
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
                    Active Contracts
                </h3>
                <StorePerformanceChart
                    data={contractsData}
                    height={height}
                    variant="donut"
                />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
                    Monthly Revenue
                </h3>
                <StorePerformanceChart
                    data={revenueData}
                    height={height}
                    variant="donut"
                    valueFormatter={formatCurrency}
                />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
                    Storage Utilization
                </h3>
                <StorePerformanceChart
                    data={utilizationData}
                    height={height}
                    variant="donut"
                    valueFormatter={(value) => `${value.toFixed(1)}%`}
                />
            </div>
        </div>
    );
}
