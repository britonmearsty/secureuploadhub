"use client"

import { motion } from "framer-motion"
import {
  FileIcon,
  Download,
  Clock,
  User,
  Mail,
  History,
  ExternalLink,
  ChevronRight,
  Inbox
} from "lucide-react"

interface Upload {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  clientName: string | null
  clientEmail: string | null
  clientMessage: string | null
  status: string
  createdAt: string
  portal: {
    name: string
    slug: string
    primaryColor: string
  }
}

interface RecentUploadsProps {
  uploads: Upload[]
}

export default function RecentUploads({ uploads }: RecentUploadsProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
        {uploads.length > 0 ? (
          <div className="w-full space-y-2">
            {uploads.map((upload, index) => (
              <motion.div
                key={upload.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-lg group"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: upload.portal.primaryColor + "20" }}
                >
                  <FileIcon className="w-5 h-5" style={{ color: upload.portal.primaryColor }} />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={upload.fileName}>
                      {upload.fileName}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase shrink-0">
                      {formatFileSize(upload.fileSize)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(upload.createdAt)}
                    </div>
                    {(upload.clientName || upload.clientEmail) && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {upload.clientName || upload.clientEmail}
                      </div>
                    )}
                  </div>
                </div>

                <a
                  href={`/api/uploads/${upload.id}/download`}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
              <Inbox className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No recent activity detected.</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 opacity-60 mt-1">Activities will appear here once you start using portals.</p>
          </>
        )}
      </div>
    </>
  )
}
