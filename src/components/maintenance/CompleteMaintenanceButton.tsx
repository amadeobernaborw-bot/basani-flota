'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { completeMaintenanceEvent } from '@/lib/actions/maintenance'

interface CompleteMaintenanceButtonProps {
  id: string
}

export default function CompleteMaintenanceButton({ id }: CompleteMaintenanceButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleComplete() {
    if (!confirm('¿Marcar este mantenimiento como completado?')) return
    setError(null)
    startTransition(async () => {
      const result = await completeMaintenanceEvent(id)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleComplete}
        disabled={isPending}
        title="Marcar como completado"
        className="inline-flex items-center gap-1 rounded-md border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <CheckCircle2 size={12} />
        )}
        Completar
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </>
  )
}
