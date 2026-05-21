'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteMileageLog } from '@/lib/actions/mileage'

interface DeleteMileageButtonProps {
  id: string
  label: string
}

export default function DeleteMileageButton({ id, label }: DeleteMileageButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar el registro de kilometraje ${label}? Esta acción no se puede deshacer.`
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deleteMileageLog(id)
      if (result.error) setError(result.error)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Trash2 size={12} />
        )}
        Eliminar
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </>
  )
}
