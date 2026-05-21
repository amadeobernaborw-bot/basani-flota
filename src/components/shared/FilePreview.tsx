'use client'

import { useState } from 'react'
import { getFileUrl } from '@/lib/actions/documents'
import { Eye, Download, X, Loader2 } from 'lucide-react'

interface FilePreviewProps {
  storagePath: string
  fileName: string
  fileType: string
}

export default function FilePreview({
  storagePath,
  fileName,
  fileType,
}: FilePreviewProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const isImage = fileType === 'image/jpeg' || fileType === 'image/png'

  async function handlePreview() {
    setLoading(true)
    setError(null)

    const { url, error: urlError } = await getFileUrl(storagePath)
    setLoading(false)

    if (urlError || !url) {
      setError('No se pudo obtener el archivo.')
      return
    }

    if (isImage) {
      setImageUrl(url)
      setShowModal(true)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  async function handleDownload() {
    setLoading(true)
    setError(null)

    const { url, error: urlError } = await getFileUrl(storagePath)
    setLoading(false)

    if (urlError || !url) {
      setError('No se pudo obtener el archivo.')
      return
    }

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.click()
  }

  function handleCloseModal() {
    setShowModal(false)
    setImageUrl(null)
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading}
          title="Previsualizar"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Eye size={12} />
          )}
          Ver
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          title="Descargar"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          <Download size={12} />
          Descargar
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* Image modal */}
      {showModal && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={handleCloseModal}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-10"
              title="Cerrar"
            >
              <X size={16} className="text-gray-700" />
            </button>
            <img
              src={imageUrl}
              alt={fileName}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-sm text-white/80 truncate max-w-[85vw]">
              {fileName}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
