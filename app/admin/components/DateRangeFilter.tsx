"use client"

import { useState } from "react"
import { Calendar, X } from "lucide-react"

interface DateRangeFilterProps {
    onFilter: (startDate: Date | null, endDate: Date | null) => void
    onClear?: () => void
    label?: string
}

type PresetRange = "today" | "week" | "month" | "quarter" | "year" | "custom"

export default function DateRangeFilter({ onFilter, onClear, label = "Filter by Date" }: DateRangeFilterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [preset, setPreset] = useState<PresetRange>("week")
    const [customStart, setCustomStart] = useState("")
    const [customEnd, setCustomEnd] = useState("")
    const [activeRange, setActiveRange] = useState<{ start: Date | null; end: Date | null }>({
        start: null,
        end: null
    })

    const getPresetDates = (range: PresetRange): { start: Date; end: Date } => {
        const end = new Date()
        const start = new Date()

        switch (range) {
            case "today":
                start.setHours(0, 0, 0, 0)
                end.setHours(23, 59, 59, 999)
                break
            case "week":
                start.setDate(end.getDate() - 7)
                break
            case "month":
                start.setMonth(end.getMonth() - 1)
                break
            case "quarter":
                start.setMonth(end.getMonth() - 3)
                break
            case "year":
                start.setFullYear(end.getFullYear() - 1)
                break
            case "custom":
                return { start: new Date(customStart), end: new Date(customEnd) }
        }

        return { start, end }
    }

    const handleApplyPreset = (range: PresetRange) => {
        setPreset(range)
        if (range === "custom") return

        const { start, end } = getPresetDates(range)
        setActiveRange({ start, end })
        onFilter(start, end)
        setIsOpen(false)
    }

    const handleApplyCustom = () => {
        if (!customStart || !customEnd) return

        const start = new Date(customStart)
        const end = new Date(customEnd)

        if (start > end) {
            alert("Start date must be before end date")
            return
        }

        setActiveRange({ start, end })
        onFilter(start, end)
        setIsOpen(false)
    }

    const handleClear = () => {
        setActiveRange({ start: null, end: null })
        setCustomStart("")
        setCustomEnd("")
        setPreset("week")
        onFilter(null, null)
        onClear?.()
        setIsOpen(false)
    }

    const getDisplayText = () => {
        if (!activeRange.start || !activeRange.end) {
            return label
        }

        const formatDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        return `${formatDate(activeRange.start)} - ${formatDate(activeRange.end)}`
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700"
            >
                <Calendar className="w-4 h-4" />
                <span>{getDisplayText()}</span>
                {activeRange.start && activeRange.end && (
                    <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleClear()
                        }}
                    />
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-lg border border-slate-200 shadow-lg z-50 p-4">
                    <div className="space-y-4">
                        {/* Preset Ranges */}
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Quick Select
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {(["today", "week", "month", "quarter", "year"] as const).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => handleApplyPreset(range)}
                                        className={`text-xs font-medium py-2 rounded-lg transition-colors ${
                                            activeRange.start && preset === range
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        {range.charAt(0).toUpperCase() + range.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Range */}
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Custom Range
                            </p>
                            <div className="space-y-2">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Start date"
                                />
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="End date"
                                />
                                <button
                                    onClick={handleApplyCustom}
                                    disabled={!customStart || !customEnd}
                                    className="w-full px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Apply Custom Range
                                </button>
                            </div>
                        </div>

                        {/* Clear Button */}
                        {activeRange.start && activeRange.end && (
                            <button
                                onClick={handleClear}
                                className="w-full px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
