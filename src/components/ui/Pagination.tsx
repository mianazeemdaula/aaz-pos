import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange
}: PaginationProps) {
    const [jumpPage, setJumpPage] = useState<string>(String(currentPage));

    useEffect(() => {
        setJumpPage(String(currentPage));
    }, [currentPage]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const handleFirst = () => {
        if (currentPage !== 1) {
            onPageChange(1);
        }
    };

    const handleLast = () => {
        if (currentPage !== totalPages) {
            onPageChange(totalPages);
        }
    };

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseInt(jumpPage, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
            onPageChange(p);
        } else {
            setJumpPage(String(currentPage));
        }
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                start = 2;
                end = 4;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
                end = totalPages - 1;
            }

            if (start > 2) pages.push('...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p className="text-gray-600 dark:text-gray-400 font-medium shrink-0">
                Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{totalItems === 0 ? 0 : startIndex + 1}</span> to <span className="font-semibold text-gray-900 dark:text-gray-100">{endIndex}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{totalItems}</span> results
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleFirst}
                        disabled={currentPage === 1}
                        title="First Page"
                        className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                    >
                        <ChevronsLeft size={16} />
                    </button>
                    <button
                        onClick={handlePrevious}
                        disabled={currentPage === 1}
                        title="Previous Page"
                        className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="hidden md:flex items-center gap-1 mx-1">
                        {getPageNumbers().map((p, idx) => (
                            typeof p === 'number' ? (
                                <button
                                    key={idx}
                                    onClick={() => onPageChange(p)}
                                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                                        currentPage === p
                                            ? 'bg-primary-600 border-primary-600 text-white font-semibold'
                                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {p}
                                </button>
                            ) : (
                                <span key={idx} className="px-1 text-gray-400 select-none">...</span>
                            )
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentPage === totalPages || totalPages === 0}
                        title="Next Page"
                        className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        onClick={handleLast}
                        disabled={currentPage === totalPages || totalPages === 0}
                        title="Last Page"
                        className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>

                <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 ml-2 border-l border-gray-200 dark:border-gray-700 pl-3">
                    <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">Page:</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={jumpPage}
                        onChange={e => setJumpPage(e.target.value)}
                        onBlur={handleJumpSubmit}
                        className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <span className="text-gray-500 dark:text-gray-400">/ {totalPages}</span>
                    <button
                        type="submit"
                        className="px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-xs font-medium"
                    >
                        Go
                    </button>
                </form>
            </div>
        </div>
    );
}

