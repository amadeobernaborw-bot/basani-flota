'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VehicleForm from '@/components/vehicles/VehicleForm'
import { createVehicle } from '@/lib/actions/vehicles'

export default function NewVehiclePage() {
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    const result = await createVehicle(formData)
    if (result.error) {
      return result
    }
    router.push('/vehicles')
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href="/vehicles"
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          ← Vehículos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuevo Vehículo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Complete los datos del nuevo vehículo.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <VehicleForm
          onSubmit={handleSubmit}
          submitLabel="Crear vehículo"
          cancelHref="/vehicles"
        />
      </div>
    </div>
  )
}
