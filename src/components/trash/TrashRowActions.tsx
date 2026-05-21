'use client'

import { useState, useTransition } from 'react'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { restoreTrashedItem, permanentlyDeleteItem } from '@/lib/actions/trash'
import type { TrashEntityType } from '@/lib/actions/trash-types'

interface TrashRowActionsProps {
  id: string
  type: TrashEntityType
  label: string
}

export default function TrashRowActions({ id, type, label }: TrashRowActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [action, setAction] = useState<'restore' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleRestore() {
    setError(null)
    setAction('restore')
    startTransition(async () => {
      const { error: actionError } = await restoreTrashedItem(type, id)
      if (actionError) {
        setError(actionError)
      }
      setAction(null)
    })
  }

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar definitivamente "${label}"? Esta acción borra el registro y los archivos asociados de forma permanente y no se puede deshacer.`
      )
    ) {
      return
    }
    setError(null)
    setAction('delete')
    startTransition(async () => {
      const { error: actionError } = await permanentlyDeleteItem(type, id)
      if (actionError) {
        setError(actionError)
      }
      setAction(null)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={handleRestore}
        disabled={isPending}
        title="Restaurar"
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {action === 'restore' && isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <RotateCcw size={12} />
        )}
        Restaurar
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        title="Eliminar definitivamente"
        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {action === 'delete' && isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Trash2 size={12} />
        )}
        Borrar
      </button>
      {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
    </div>
  )
}
