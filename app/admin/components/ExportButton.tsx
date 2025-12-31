"use client"

import { useState } from "react"
import { Download, Loader } from "lucide-react"

type ExportFormat = "csv" | "json"

interface ExportButtonProps {
    data: any[]
    filename?: string
    format?: ExportFormat
    label?: string
    onExport?: (format: ExportFormat) => Promise<void>
}

export default function ExportButton({
    data,
    filename = "export",
    format = "csv",
    label = "Export",
    onExport
}: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const convertToCSV = (data: any[]): string => {
        if (data.length === 0) return ""

        const headers = Object.keys(data[0])
        const csv = [
            headers.map(h => `"${h}"`).join(","),
            ...data.map(row =>
                headers
                    .map(header => {
                        const value = row[header]
                        if (value === null || value === undefined) return ""
                        if (typeof value === "object") return `"${JSON.stringify(value)}"`
                        return `"${String(value).replace(/"/g, '""')}"`
                    })
                    .join(",")
            )
        ].join("\n")

        return csv
    }

    const downloadFile = (content: string, ext: string, mimeType: string) => {
        const element = document.createElement("a")
        element.setAttribute("href", `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`)
        element.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.${ext}`)
        element.style.display = "none"
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    const handleExportCSV = async () => {
        setIsExporting(true)
        try {
            if (onExport) {
                await onExport("csv")
            } else {
                const csv = convertToCSV(data)
                downloadFile(csv, "csv", "text/csv")
            }
        } finally {
            setIsExporting(false)
            setIsOpen(false)
        }
    }

    const handleExportJSON = async () => {
        setIsExporting(true)
        try {
            if (onExport) {
                await onExport("json")
            } else {
                const json = JSON.stringify(data, null, 2)
                downloadFile(json, "json", "application/json")
            }
        } finally {
            setIsExporting(false)
            setIsOpen(false)
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={data.length === 0 || isExporting}
                className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-slate-700"
            >
                {isExporting ? (
                    <Loader className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                <span>{label}</span>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-40 bg-white rounded-lg border border-slate-200 shadow-lg z-50">
                    <button
                        onClick={handleExportCSV}
                        disabled={isExporting}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 disabled:opacity-50 text-sm transition-colors border-b border-slate-200"
                    >
                        Export as CSV
                    </button>
                    <button
                        onClick={handleExportJSON}
                        disabled={isExporting}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 disabled:opacity-50 text-sm transition-colors"
                    >
                        Export as JSON
                    </button>
                </div>
            )}
        </div>
    )
}
