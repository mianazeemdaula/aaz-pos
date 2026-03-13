import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface ItemsStatsChartProps {
    data: Array<{
        month: string;
        stockIn: number;
        stockOut: number;
        netChange?: number;
    }>;
    height?: number;
    itemName?: string; // Currently unused but available for future enhancements
}

export function ItemsStatsChart({
    data,
    height = 300,
}: ItemsStatsChartProps) {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const stockIn = payload.find((p: any) => p.dataKey === 'stockIn')?.value || 0;
            const stockOut = payload.find((p: any) => p.dataKey === 'stockOut')?.value || 0;
            const netChange = stockIn - stockOut;

            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {label}
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-gray-600 dark:text-gray-400">Stock In:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {stockIn.toLocaleString()} kg
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-gray-600 dark:text-gray-400">Stock Out:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {stockOut.toLocaleString()} kg
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Net Change:</span>
                            <span
                                className={`font-bold ${netChange >= 0
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }`}
                            >
                                {netChange >= 0 ? '+' : ''}
                                {netChange.toLocaleString()} kg
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
            <BarChart data={data}>
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
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    iconType="circle"
                />
                <Bar
                    dataKey="stockIn"
                    name="Stock In"
                    fill="#22c55e"
                    radius={[8, 8, 0, 0]}
                />
                <Bar
                    dataKey="stockOut"
                    name="Stock Out"
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
