'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'

interface ConsolidatedPdfButtonProps {
  entityType: 'employee' | 'vehicle'
  entityId: string
  className?: string
}

export default function ConsolidatedPdfButton({
  entityType,
  entityId,
  className,
}: ConsolidatedPdfButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/pdf/${entityType}/${entityId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error inesperado' }))
        setError(body.error ?? 'No se pudo generar el PDF.')
        return
      }

      const filenameHeader = res.headers.get('Content-Disposition') ?? ''
      const match = /filename="?([^";]+)"?/i.exec(filenameHeader)
      const filename = match?.[1] ?? `Basani_${entityType}_${entityId}.pdf`

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={
          className ??
          'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50'
        }
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileDown size={14} />
        )}
        {loading ? 'Generando...' : 'PDF consolidado'}
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </>
  )
}
