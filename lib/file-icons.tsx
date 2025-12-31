import {
    FileText,
    FileImage,
    FileVideo,
    FileAudio,
    FileArchive,
    FileCode,
    FileSpreadsheet,
    File,
    FileType,
} from "lucide-react"

export function getFileIcon(mimeType: string, fileName?: string) {
    // Image files
    if (mimeType.startsWith("image/")) {
        return FileImage
    }

    // Video files
    if (mimeType.startsWith("video/")) {
        return FileVideo
    }

    // Audio files
    if (mimeType.startsWith("audio/")) {
        return FileAudio
    }

    // PDF files
    if (mimeType === "application/pdf") {
        return FileType
    }

    // Archive files
    if (
        mimeType === "application/zip" ||
        mimeType === "application/x-rar-compressed" ||
        mimeType === "application/x-7z-compressed" ||
        mimeType === "application/x-tar" ||
        mimeType === "application/gzip"
    ) {
        return FileArchive
    }

    // Spreadsheet files
    if (
        mimeType === "application/vnd.ms-excel" ||
        mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mimeType === "text/csv"
    ) {
        return FileSpreadsheet
    }

    // Code files
    if (
        mimeType === "text/javascript" ||
        mimeType === "application/javascript" ||
        mimeType === "text/typescript" ||
        mimeType === "application/json" ||
        mimeType === "text/html" ||
        mimeType === "text/css" ||
        mimeType === "application/xml" ||
        mimeType === "text/xml"
    ) {
        return FileCode
    }

    // Text files
    if (mimeType.startsWith("text/")) {
        return FileText
    }

    // Check by file extension if mime type is generic
    if (fileName) {
        const ext = fileName.split(".").pop()?.toLowerCase()

        if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext || "")) {
            return FileImage
        }

        if (["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"].includes(ext || "")) {
            return FileVideo
        }

        if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext || "")) {
            return FileAudio
        }

        if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext || "")) {
            return FileArchive
        }

        if (["js", "ts", "jsx", "tsx", "json", "html", "css", "xml", "py", "java", "cpp", "c", "go", "rs"].includes(ext || "")) {
            return FileCode
        }

        if (["xls", "xlsx", "csv"].includes(ext || "")) {
            return FileSpreadsheet
        }

        if (ext === "pdf") {
            return FileType
        }
    }

    // Default file icon
    return File
}

export function getFileIconColor(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "text-purple-500"
    if (mimeType.startsWith("video/")) return "text-red-500"
    if (mimeType.startsWith("audio/")) return "text-blue-500"
    if (mimeType === "application/pdf") return "text-red-600"
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("archive")) return "text-yellow-600"
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") return "text-green-600"
    if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("html")) return "text-orange-500"
    if (mimeType.startsWith("text/")) return "text-slate-600"

    return "text-slate-400"
}
