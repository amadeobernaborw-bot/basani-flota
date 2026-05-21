import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import {
  getMaintenanceEvent,
  updateMaintenanceEvent,
  getActiveVehiclesForMaintenance,
} from '@/lib/actions/maintenance'
import MaintenanceForm from '@/components/maintenance/MaintenanceForm'
import DeleteMaintenanceButton from '@/components/maintenance/DeleteMaintenanceButton'
import CompleteMaintenanceButton from '@/components/maintenance/CompleteMaintenanceButton'
import type {
  MaintenanceEventStatus,
  Profile,
} from '@/types/database'

const ESTADO_LABELS: Record<MaintenanceEventStatus, string> = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  vencido: 'Vencido',
}

const ESTADO_CLASSES: Record<MaintenanceEventStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  completado: 'bg-blue-100 text-blue-800',
  vencido: 'bg-red-100 text-red-800',
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function MaintenanceDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const { edit } = await searchParams

  const { data: event, error } = await getMaintenanceEvent(id)
  if (error || !event) notFound()

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

  const isAdmin = profile?.role === 'admin'
  const isEditing = edit === '1' && isAdmin

  const { data: vehicles } = isEditing
    ? await getActiveVehiclesForMaintenance()
    : { data: [] }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/maintenance"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Mantenimiento
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {event.descripcion}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASSES[event.estado]}`}
            >
              {ESTADO_LABELS[event.estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            <Link
              href={`/vehicles/${event.vehicle_id}`}
              className="hover:text-gray-700"
            >
              {event.vehicle?.patente ?? '—'} ({event.vehicle?.marca} {event.vehicle?.modelo})
            </Link>
            {' · '}
            {event.tipo === 'preventivo' ? 'Preventivo' : 'Correctivo'}
          </p>
        </div>

        {isAdmin && !isEditing && (
          <div className="flex items-center gap-2 shrink-0">
            {event.estado === 'pendiente' && (
              <CompleteMaintenanceButton id={id} />
            )}
            <Link
              href={`/maintenance/${id}?edit=1`}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Editar
            </Link>
            <DeleteMaintenanceButton id={id} />
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <MaintenanceForm
            vehicles={vehicles}
            defaultValues={event}
            lockVehicle
            cancelHref={`/maintenance/${id}`}
            submitLabel="Guardar cambios"
            onSubmit={async (formData) => {
              'use server'
              const result = await updateMaintenanceEvent(id, formData)
              if (result.error) return result
              const { redirect: doRedirect } = await import('next/navigation')
              doRedirect(`/maintenance/${id}`)
            }}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fecha" value={formatDate(event.fecha)} />
            <Field
              label="Kilometraje"
              value={
                event.kilometraje !== null
                  ? event.kilometraje.toLocaleString('es-AR')
                  : '—'
              }
            />
            <Field
              label="Próximo kilometraje"
              value={
                event.proximo_kilometraje !== null
                  ? event.proximo_kilometraje.toLocaleString('es-AR')
                  : '—'
              }
            />
            <Field
              label="Próxima revisión"
              value={formatDate(event.proxima_revision)}
            />
            <div className="sm:col-span-2">
              <Field label="Observaciones" value={event.observaciones ?? '—'} />
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  )
}
