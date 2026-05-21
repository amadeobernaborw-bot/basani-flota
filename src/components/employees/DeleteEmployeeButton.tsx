'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { softDeleteEmployee } from '@/lib/actions/employees'

interface DeleteEmployeeButtonProps {
  id: string
}

export default function DeleteEmployeeButton({ id }: DeleteEmployeeButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    const confirmed = window.confirm(
      '¿Está seguro que desea eliminar este empleado? El registro pasará a la papelera y podrá restaurarse.'
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const result = await softDeleteEmployee(id)
      if (result.error) {
        alert(`Error al eliminar: ${result.error}`)
        setIsDeleting(false)
        return
      }
      router.push('/employees')
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
