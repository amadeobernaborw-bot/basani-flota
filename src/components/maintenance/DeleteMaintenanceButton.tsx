'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { softDeleteMaintenanceEvent } from '@/lib/actions/maintenance'

interface DeleteMaintenanceButtonProps {
  id: string
  redirectTo?: string
}

export default function DeleteMaintenanceButton({
  id,
  redirectTo = '/maintenance',
}: DeleteMaintenanceButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (
      !confirm(
        '¿Eliminar este evento de mantenimiento? Podrás restaurarlo desde la papelera dentro de los próximos 30 días.'
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await softDeleteMaintenanceEvent(id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
        Eliminar
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </>
  )
}
