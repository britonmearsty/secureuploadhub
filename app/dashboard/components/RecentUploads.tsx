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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center bg-slate-50/30">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Recent Activity</h3>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {uploads.length > 0 ? (
          uploads.map((upload, index) => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-all group"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-transparent group-hover:bg-white group-hover:border-slate-100 transition-all"
                style={{ backgroundColor: upload.portal.primaryColor + "10" }}
              >
                <FileIcon className="w-5 h-5" style={{ color: upload.portal.primaryColor }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-bold text-slate-900 truncate" title={upload.fileName}>
                    {upload.fileName}
                  </h4>
                  <span className="text-[10px] font-black text-slate-300 uppercase shrink-0">
                    {formatFileSize(upload.fileSize)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-300" />
                    {formatTimeAgo(upload.createdAt)}
                  </div>
                  {(upload.clientName || upload.clientEmail) && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-300" />
                      {upload.clientName || upload.clientEmail}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-slate-500">
                      {upload.portal.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href={`/api/uploads/${upload.id}/download`}
                  className="p-2.5 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-none hover:shadow-sm"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button className="p-2.5 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-none hover:shadow-sm">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center">
            <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto mb-4">
              <Inbox className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No recent activity detected.</p>
          </div>
        )}
      </div>
    </div>
  )
}
