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
  Inbox,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Archive,
  Code
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

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.startsWith('audio/')) return Music
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar')) return Archive
    if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.json') || fileName.endsWith('.html') || fileName.endsWith('.css')) return Code
    return FileIcon
  }

  // Only show the first 3 uploads
  const recentUploads = uploads.slice(0, 3)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" role="region" aria-label="Recent Uploads List">
      <ul className="divide-y divide-slate-100 m-0 p-0 list-none">
        {recentUploads.length > 0 ? (
          recentUploads.map((upload, index) => {
            const Icon = getFileIcon(upload.mimeType, upload.fileName)
            return (
              <motion.li
                key={upload.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-all group"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-transparent group-hover:bg-white group-hover:border-slate-100 transition-all"
                  style={{ backgroundColor: upload.portal.primaryColor + "10" }}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" style={{ color: upload.portal.primaryColor }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={upload.fileName}>
                      {upload.fileName}
                    </h4>
                    <span className="text-[10px] font-black text-slate-300 uppercase shrink-0" aria-label={`File size ${formatFileSize(upload.fileSize)}`}>
                      {formatFileSize(upload.fileSize)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
                    <div className="flex items-center gap-1.5" aria-label={`Uploaded ${formatTimeAgo(upload.createdAt)}`}>
                      <Clock className="w-3 h-3 text-slate-300" aria-hidden="true" />
                      {formatTimeAgo(upload.createdAt)}
                    </div>
                    {(upload.clientName || upload.clientEmail) && (
                      <div className="flex items-center gap-1.5" aria-label={`Uploaded by ${upload.clientName || upload.clientEmail}`}>
                        <User className="w-3 h-3 text-slate-300" aria-hidden="true" />
                        {upload.clientName || upload.clientEmail}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-slate-500">
                        {upload.portal.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={`/api/uploads/${upload.id}/download`}
                    download={upload.fileName}
                    className="p-2.5 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-none hover:shadow-sm"
                    title="Download"
                    aria-label={`Download ${upload.fileName}`}
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
              </motion.li>
            )
          })
        ) : (
          <li className="py-20 text-center">
            <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto mb-4" aria-hidden="true">
              <Inbox className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No recent activity detected.</p>
            <p className="text-slate-400 text-xs mt-1">Files uploaded to your portals will appear here.</p>
          </li>
        )}
      </ul>
    </div>
  )
}
