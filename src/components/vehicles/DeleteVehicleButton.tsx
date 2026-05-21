'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { softDeleteVehicle } from '@/lib/actions/vehicles'

interface DeleteVehicleButtonProps {
  id: string
}

export default function DeleteVehicleButton({ id }: DeleteVehicleButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    const confirmed = window.confirm(
      '¿Está seguro que desea eliminar este vehículo? El registro pasará a la papelera y podrá restaurarse.'
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const result = await softDeleteVehicle(id)
      if (result.error) {
        alert(`Error al eliminar: ${result.error}`)
        setIsDeleting(false)
        return
      }
      router.push('/vehicles')
      router.refresh()
    } catch {
      alert('Ocurrió un error inesperado.')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isDeleting ? 'Eliminando...' : 'Eliminar'}
    </button>
  )
}
