"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginatedListProps<T> {
    items: T[]
    itemsPerPage?: number
    renderItem: (item: T, index: number) => React.ReactNode
    renderHeader?: () => React.ReactNode
    emptyMessage?: string
}

export default function PaginatedList<T>({
    items,
    itemsPerPage = 10,
    renderItem,
    renderHeader,
    emptyMessage = "No items found"
}: PaginatedListProps<T>) {
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.ceil(items.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentItems = items.slice(startIndex, endIndex)

    const goToPage = (page: number) => {
        const pageNum = Math.max(1, Math.min(page, totalPages))
        setCurrentPage(pageNum)
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500 text-sm">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {renderHeader && (
                <div className="border-b border-slate-200 pb-4">
                    {renderHeader()}
                </div>
            )}

            <div className="space-y-3">
                {currentItems.map((item, index) => renderItem(item, startIndex + index))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-500">
                        Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                let pageNum = i + 1
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i
                                }
                                if (pageNum > totalPages) return null

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => goToPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg transition-colors ${
                                            currentPage === pageNum
                                                ? "bg-slate-900 text-white"
                                                : "hover:bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="text-sm text-slate-500">
                        Page {currentPage} of {totalPages}
                    </div>
                </div>
            )}
        </div>
    )
}
