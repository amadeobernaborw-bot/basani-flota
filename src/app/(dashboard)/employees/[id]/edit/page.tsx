import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEmployee, updateEmployee } from '@/lib/actions/employees'
import EmployeeForm from '@/components/employees/EmployeeForm'

interface EditEmployeePageProps {
  params: Promise<{ id: string }>
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { id } = await params
  const { data: employee, error } = await getEmployee(id)

  if (error || !employee) {
    notFound()
  }

  async function handleSubmit(formData: FormData) {
    'use server'
    return updateEmployee(id, formData)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href={`/employees/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          ← {employee.nombre} {employee.apellido}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Editar Empleado</h1>
        <p className="mt-1 text-sm text-gray-500">
          Modifique los datos del empleado y guarde los cambios.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <EmployeeForm
          defaultValues={employee}
          onSubmit={handleSubmit}
          submitLabel="Guardar cambios"
          cancelHref={`/employees/${id}`}
        />
      </div>
    </div>
  )
}
