import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { getVehicle, getDriverHistory } from '@/lib/actions/vehicles'
import { getMaintenanceEvents } from '@/lib/actions/maintenance'
import { getLatestMileage } from '@/lib/actions/mileage'
import { createClient } from '@/lib/supabase/server'
import DeleteVehicleButton from '@/components/vehicles/DeleteVehicleButton'
import VehicleDocumentsTab from '@/components/vehicles/VehicleDocumentsTab'
import ConsolidatedPdfButton from '@/components/shared/ConsolidatedPdfButton'
import DriverHistorySection from '@/components/vehicles/DriverHistorySection'
import CompleteMaintenanceButton from '@/components/maintenance/CompleteMaintenanceButton'
import type {
  VehicleStatus,
  VehicleCategory,
  MaintenanceEventStatus,
  Profile,
} from '@/types/database'

const ESTADO_LABELS: Record<VehicleStatus, string> = {
  activo: 'Activo',
  fuera_de_servicio: 'Fuera de servicio',
  baja: 'Baja',
}

const ESTADO_CLASSES: Record<VehicleStatus, string> = {
  activo: 'bg-green-100 text-green-800',
  fuera_de_servicio: 'bg-yellow-100 text-yellow-800',
  baja: 'bg-red-100 text-red-800',
}

const CATEGORIA_LABELS: Record<VehicleCategory, string> = {
  auto: 'Auto',
  camioneta: 'Camioneta',
  camion: 'Camión',
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || '—'}</dd>
    </div>
  )
}

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

type ActiveTab = 'info' | 'documentos' | 'conductores' | 'mantenimiento'

function resolveTab(tab: string | undefined): ActiveTab {
  if (tab === 'documentos') return 'documentos'
  if (tab === 'conductores') return 'conductores'
  if (tab === 'mantenimiento') return 'mantenimiento'
  return 'info'
}

const MAINT_ESTADO_LABELS: Record<MaintenanceEventStatus, string> = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  vencido: 'Vencido',
}

const MAINT_ESTADO_CLASSES: Record<MaintenanceEventStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  completado: 'bg-blue-100 text-blue-800',
  vencido: 'bg-red-100 text-red-800',
}

function formatMaintenanceDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

export default async function VehicleDetailPage({
  params,
  searchParams,
}: VehicleDetailPageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = resolveTab(tab)

  const { data: vehicle, error } = await getVehicle(id)

  if (error || !vehicle) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<Pick<Profile, 'role'>>()
    isAdmin = profile?.role === 'admin'
  }

  const { data: driverHistory } =
    activeTab === 'conductores' ? await getDriverHistory(id) : { data: [] }

  const { data: maintenanceEvents } =
    activeTab === 'mantenimiento'
      ? await getMaintenanceEvents({ vehicleId: id, limit: 100 })
      : { data: [] }

  const { data: latestMileage } =
    activeTab === 'info' ? await getLatestMileage(id) : { data: null }

  const tabBase = `/vehicles/${id}`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/vehicles"
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          >
            ← Vehículos
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-wide">
              {vehicle.patente}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASSES[vehicle.estado]}`}
            >
              {ESTADO_LABELS[vehicle.estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {vehicle.marca} {vehicle.modelo} {vehicle.anio} —{' '}
            {CATEGORIA_LABELS[vehicle.categoria]}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ConsolidatedPdfButton entityType="vehicle" entityId={id} />
          {isAdmin && (
            <>
              <Link
                href={`/vehicles/${id}/edit`}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Editar
              </Link>
              <DeleteVehicleButton id={id} />
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <Link
            href={`${tabBase}?tab=info`}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Información
          </Link>
          <Link
            href={`${tabBase}?tab=documentos`}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'documentos'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Documentos
          </Link>
          <Link
            href={`${tabBase}?tab=conductores`}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'conductores'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Conductores
          </Link>
          <Link
            href={`${tabBase}?tab=mantenimiento`}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mantenimiento'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mantenimiento
          </Link>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kilometraje actual */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Kilometraje actual
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {latestMileage
                    ? `${latestMileage.kilometraje.toLocaleString('es-AR')} km`
                    : 'Sin registros'}
                </p>
                {latestMileage && (
                  <p className="mt-1 text-xs text-gray-500">
                    Último registro: {String(latestMileage.mes).padStart(2, '0')}/{latestMileage.anio} ·{' '}
                    {latestMileage.fuente === 'email' ? 'Carga por email' : 'Carga manual'}
                  </p>
                )}
              </div>
              <Link
                href={`/mileage?vehicleId=${id}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Ver historial
              </Link>
            </div>
          </div>

          {/* Datos del vehículo */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-5 pb-2 border-b border-gray-100">
              Identificación
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Marca" value={vehicle.marca} />
              <InfoField label="Modelo" value={vehicle.modelo} />
              <InfoField label="Año" value={String(vehicle.anio)} />
              <InfoField label="Patente" value={vehicle.patente} />
            </dl>
          </div>

          {/* Clasificación y datos técnicos */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-5 pb-2 border-b border-gray-100">
              Clasificación y técnica
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField
                label="Categoría"
                value={CATEGORIA_LABELS[vehicle.categoria]}
              />
              <InfoField
                label="Estado"
                value={ESTADO_LABELS[vehicle.estado]}
              />
              <InfoField label="N° de chasis" value={vehicle.chasis} />
              <InfoField label="N° de motor" value={vehicle.motor} />
              <div className="sm:col-span-2">
                <InfoField label="Observaciones" value={vehicle.observaciones} />
              </div>
              <InfoField
                label="Registrado"
                value={formatDate(vehicle.created_at)}
              />
              <InfoField
                label="Última modificación"
                value={formatDate(vehicle.updated_at)}
              />
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <VehicleDocumentsTab vehicleId={id} isAdmin={isAdmin} />
        </div>
      )}

      {activeTab === 'conductores' && (
        <DriverHistorySection
          vehicleId={id}
          history={driverHistory}
          isAdmin={isAdmin}
        />
      )}

      {activeTab === 'mantenimiento' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {maintenanceEvents.length} evento{maintenanceEvents.length === 1 ? '' : 's'}
            </p>
            {isAdmin && (
              <Link
                href={`/maintenance/new?vehicleId=${id}`}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
              >
                Nuevo evento
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {maintenanceEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium text-gray-500">
                  Sin eventos de mantenimiento
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Registre el primer service o reparación.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">KM</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Próx. revisión</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatMaintenanceDate(evt.fecha)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[280px]">
                        <p className="truncate">{evt.descripcion}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize">
                        {evt.tipo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {evt.kilometraje ? evt.kilometraje.toLocaleString('es-AR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatMaintenanceDate(evt.proxima_revision)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${MAINT_ESTADO_CLASSES[evt.estado]}`}
                        >
                          {MAINT_ESTADO_LABELS[evt.estado]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && evt.estado === 'pendiente' && (
                            <CompleteMaintenanceButton id={evt.id} />
                          )}
                          <Link
                            href={`/maintenance/${evt.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-gray-600"
                          >
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
