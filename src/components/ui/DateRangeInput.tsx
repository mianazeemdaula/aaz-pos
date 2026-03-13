const DateRangeInput = () => {
    return (
        <div className="flex items-center gap-3">

            {/* Start Date */}
            <div className="relative">
                <input
                    type="text"
                    defaultValue="02/06/2026"
                    className="w-40 rounded-lg border border-gray-300 px-4 py-2 pr-10 text-sm text-gray-700 outline-none
                     focus:ring-2 focus:ring-gray-300"
                />
                <CalendarIcon />
            </div>

            {/* Dash */}
            <span className="text-gray-400">-</span>

            {/* End Date */}
            <div className="relative">
                <input
                    type="text"
                    defaultValue="02/21/2026"
                    className="w-40 rounded-lg border border-gray-300 px-4 py-2 pr-10 text-sm text-gray-700 outline-none
                     focus:ring-2 focus:ring-gray-300"
                />
                <CalendarIcon />
            </div>

        </div>
    );
};

const CalendarIcon = () => (
    <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
    >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

export default DateRangeInput;
