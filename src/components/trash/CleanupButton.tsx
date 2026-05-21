'use client'

import { useState, useTransition } from 'react'
import { Loader2, Eraser } from 'lucide-react'
import { cleanupExpiredTrash } from '@/lib/actions/trash'

interface CleanupButtonProps {
  expiredCount: number
}

export default function CleanupButton({ expiredCount }: CleanupButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleCleanup() {
    if (
      !confirm(
        `¿Eliminar definitivamente ${expiredCount} elemento(s) con más de 30 días en papelera? Esta acción no se puede deshacer.`
      )
    ) {
      return
    }
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const { deleted, error: actionError } = await cleanupExpiredTrash()
      if (actionError) {
        setError(actionError)
      } else {
        setMessage(`${deleted} elemento(s) eliminado(s) definitivamente.`)
      }
    })
  }

  if (expiredCount === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleCleanup}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Eraser size={14} />
        )}
        Vaciar {expiredCount} expirado(s)
      </button>
      {message && <span className="text-xs text-green-700">{message}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
