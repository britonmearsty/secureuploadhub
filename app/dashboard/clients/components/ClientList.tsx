'use client'

import { useState } from 'react'
import { X, Download } from 'lucide-react'

interface Client {
  key: string
  name: string | null
  email: string | null
  portals: string[]
  lastUpload: Date
  uploadCount: number
}

interface FileUpload {
  id: string
  fileName: string
  fileSize: number
  createdAt: string
  portal: {
    name: string
  }
}

interface ClientListProps {
  clients: Client[]
}

export default function ClientList({ clients }: ClientListProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [files, setFiles] = useState<FileUpload[]>([])
  const [loading, setLoading] = useState(false)

  const handleClientClick = async (client: Client) => {
    setSelectedClient(client)
    setShowModal(true)
    setLoading(true)

    // Trigger automatic sync in background when opening client modal
    const triggerAutoSync = async () => {
      try {
        await fetch("/api/storage/user-sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        // Silently sync - no need to show results to user
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.log("Background sync completed");
      }
    };

    try {
      const params = new URLSearchParams()
      if (client.email) params.append('clientEmail', client.email)
      if (client.name) params.append('clientName', client.name)

      // Trigger sync and fetch files in parallel
      const [syncPromise, response] = await Promise.all([
        triggerAutoSync(),
        fetch(`/api/uploads/client?${params}`)
      ]);

      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      } else {
        console.error('Failed to fetch files')
        setFiles([])
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedClient(null)
    setFiles([])
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <>
      <div className="space-y-4">
        {clients.map((client) => (
          <div
            key={client.key}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => handleClientClick(client)}
          >
            <div>
              <h3 className="font-medium text-gray-900">
                {client.name || client.email || "Unknown Client"}
              </h3>
              {client.email && client.name && (
                <p className="text-sm text-gray-600">{client.email}</p>
              )}
              <p className="text-sm text-gray-500">
                Portals: {client.portals.join(", ")} · {client.uploadCount} uploads · Last upload: {client.lastUpload.toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Files from {selectedClient.name || selectedClient.email || "Unknown Client"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No files found for this client.</p>
              ) : (
                <div className="space-y-4">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(file.fileSize)} · Uploaded {new Date(file.createdAt).toLocaleDateString()} · Portal: {file.portal.name}
                        </p>
                      </div>
                      <a
                        href={`/api/uploads/${file.id}/download`}
                        className="ml-4 text-blue-600 hover:text-blue-800 flex items-center"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download size={20} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}