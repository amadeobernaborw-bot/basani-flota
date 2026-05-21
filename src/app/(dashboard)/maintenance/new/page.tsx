import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createMaintenanceEvent,
  getActiveVehiclesForMaintenance,
} from '@/lib/actions/maintenance'
import MaintenanceForm from '@/components/maintenance/MaintenanceForm'
import type { Profile } from '@/types/database'

interface NewMaintenancePageProps {
  searchParams: Promise<{ vehicleId?: string }>
}

export default async function NewMaintenancePage({
  searchParams,
}: NewMaintenancePageProps) {
  const params = await searchParams
  const presetVehicleId = params.vehicleId

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<Pick<Profile, 'role'>>()

  if (profile?.role !== 'admin') redirect('/maintenance')

  const { data: vehicles } = await getActiveVehiclesForMaintenance()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/maintenance"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Mantenimiento
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuevo evento</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <MaintenanceForm
          vehicles={vehicles}
          defaultValues={presetVehicleId ? { vehicle_id: presetVehicleId } : undefined}
          lockVehicle={Boolean(presetVehicleId)}
          onSubmit={async (formData) => {
            'use server'
            const result = await createMaintenanceEvent(formData)
            if (result.error) return result
            const vehicleId = formData.get('vehicle_id')?.toString()
            const { redirect: doRedirect } = await import('next/navigation')
            doRedirect(vehicleId ? `/vehicles/${vehicleId}?tab=mantenimiento` : '/maintenance')
          }}
        />
      </div>
    </div>
  )
}
