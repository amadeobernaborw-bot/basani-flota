import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getVehicle, updateVehicle } from '@/lib/actions/vehicles'
import VehicleForm from '@/components/vehicles/VehicleForm'

interface EditVehiclePageProps {
  params: Promise<{ id: string }>
}

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = await params
  const { data: vehicle, error } = await getVehicle(id)

  if (error || !vehicle) {
    notFound()
  }

  async function handleSubmit(formData: FormData) {
    'use server'
    return updateVehicle(id, formData)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href={`/vehicles/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          ← {vehicle.patente} — {vehicle.marca} {vehicle.modelo}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Editar Vehículo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Modifique los datos del vehículo y guarde los cambios.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <VehicleForm
          defaultValues={vehicle}
          onSubmit={handleSubmit}
          submitLabel="Guardar cambios"
          cancelHref={`/vehicles/${id}`}
        />
      </div>
    </div>
  )
}
