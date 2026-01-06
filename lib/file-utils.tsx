import {
  FileText,
  FileJson,
  FileCode,
  FileImage,
  Music,
  Video,
  Archive,
  File as FileIcon,
  Cloud,
  HardDrive,
  Server
} from "lucide-react"

export function getFileIcon(fileName: string = "", mimeType: string = "") {
  const extension = fileName.split('.').pop()?.toLowerCase() || ""
  
  // Check by MIME type first
  if (mimeType.startsWith("image/")) {
    return <FileImage className="w-5 h-5 text-indigo-500" />
  }
  if (mimeType.startsWith("video/")) {
    return <Video className="w-5 h-5 text-pink-500" />
  }
  if (mimeType.startsWith("audio/")) {
    return <Music className="w-5 h-5 text-amber-500" />
  }
  if (mimeType.includes("pdf")) {
    return <FileText className="w-5 h-5 text-red-500" />
  }
  
  // Check by file extension
  switch (extension) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />
    case 'doc':
    case 'docx':
      return <FileText className="w-5 h-5 text-blue-500" />
    case 'xls':
    case 'xlsx':
      return <FileText className="w-5 h-5 text-green-500" />
    case 'ppt':
    case 'pptx':
      return <FileText className="w-5 h-5 text-orange-500" />
    case 'txt':
    case 'rtf':
      return <FileText className="w-5 h-5 text-gray-500" />
    case 'json':
      return <FileJson className="w-5 h-5 text-yellow-500" />
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
      return <FileCode className="w-5 h-5 text-purple-500" />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
    case 'webp':
      return <FileImage className="w-5 h-5 text-indigo-500" />
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
    case 'ogg':
      return <Music className="w-5 h-5 text-amber-500" />
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
    case 'webm':
      return <Video className="w-5 h-5 text-pink-500" />
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <Archive className="w-5 h-5 text-brown-500" />
    default:
      return <FileIcon className="w-5 h-5 text-muted-foreground" />
  }
}

export function getProviderIcon(provider: string) {
  switch (provider?.toLowerCase()) {
    case 'onedrive':
      return <Cloud className="w-4 h-4 text-blue-600" />
    case 'googledrive':
      return <Cloud className="w-4 h-4 text-green-600" />
    case 'dropbox':
      return <Cloud className="w-4 h-4 text-blue-500" />
    case 'local':
      return <HardDrive className="w-4 h-4 text-gray-600" />
    default:
      return <Server className="w-4 h-4 text-muted-foreground" />
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}