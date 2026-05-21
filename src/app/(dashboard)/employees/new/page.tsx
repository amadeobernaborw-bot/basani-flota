'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import EmployeeForm from '@/components/employees/EmployeeForm'
import { createEmployee } from '@/lib/actions/employees'

export default function NewEmployeePage() {
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    const result = await createEmployee(formData)
    if (result.error) {
      return result
    }
    router.push('/employees')
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href="/employees"
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          ← Empleados
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuevo Empleado</h1>
        <p className="mt-1 text-sm text-gray-500">
          Complete los datos del nuevo empleado.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <EmployeeForm
          onSubmit={handleSubmit}
          submitLabel="Crear empleado"
          cancelHref="/employees"
        />
      </div>
    </div>
  )
}
