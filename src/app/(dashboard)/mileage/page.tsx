import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Gauge } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMileageLogs } from '@/lib/actions/mileage'
import { getActiveVehiclesForMaintenance } from '@/lib/actions/maintenance'
import MileageForm from '@/components/mileage/MileageForm'
import DeleteMileageButton from '@/components/mileage/DeleteMileageButton'
import type { MileageLog, Profile } from '@/types/database'

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

interface SearchParams {
  mes?: string
  anio?: string
  vehicleId?: string
  page?: string
}

interface MileagePageProps {
  searchParams: Promise<SearchParams>
}

export default async function MileagePage({ searchParams }: MileagePageProps) {
  const params = await searchParams
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1
  const mes = params.mes ? parseInt(params.mes, 10) : undefined
  const anio = params.anio ? parseInt(params.anio, 10) : undefined
  const vehicleId = params.vehicleId

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

  const [{ data: logs, total }, { data: vehicles }] = await Promise.all([
    getMileageLogs({
      mes: mes && mes >= 1 && mes <= 12 ? mes : undefined,
      anio: anio && anio >= 1900 ? anio : undefined,
      vehicleId,
      page,
      limit: 30,
    }),
    getActiveVehiclesForMaintenance(),
  ])

  const totalPages = Math.ceil(total / 30)
  const now = new Date()
  const yearOptions: number[] = []
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 5; y--) {
    yearOptions.push(y)
  }

  function buildUrl(updates: Partial<SearchParams>): string {
    const query = new URLSearchParams()
    const merged = { ...params, ...updates }
    if (merged.mes) query.set('mes', merged.mes)
    if (merged.anio) query.set('anio', merged.anio)
    if (merged.vehicleId) query.set('vehicleId', merged.vehicleId)
    if (merged.page && merged.page !== '1') query.set('page', merged.page)
    const qs = query.toString()
    return `/mileage${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Kilometraje</h1>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700">
            {total}
          </span>
        </div>
      </div>

      {/* Create form — admin only */}
      {isAdmin && (
        <MileageForm vehicles={vehicles} presetVehicleId={vehicleId} />
      )}

      {/* Filters */}
      <form method="GET" action="/mileage" className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Mes
          </label>
          <select
            name="mes"
            defaultValue={mes ?? ''}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Todos los meses</option>
            {MONTH_LABELS.map((label, idx) => (
              <option key={idx} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Año
          </label>
          <select
            name="anio"
            defaultValue={anio ?? ''}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Todos los años</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Vehículo
          </label>
          <select
            name="vehicleId"
            defaultValue={vehicleId ?? ''}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[220px]"
          >
            <option value="">Todos los vehículos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.patente} — {v.marca} {v.modelo}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
        >
          Filtrar
        </button>
        {(mes || anio || vehicleId) && (
          <Link
            href="/mileage"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Gauge size={32} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              No hay registros de kilometraje
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {isAdmin
                ? 'Cargá el primer kilometraje con el formulario superior.'
                : 'Aún no se han cargado registros para este filtro.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Vehículo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Período</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Kilometraje</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fuente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Registrado</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: MileageLog) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/vehicles/${log.vehicle_id}`}
                      className="font-medium text-gray-900 hover:text-gray-600"
                    >
                      {log.vehicle?.patente ?? '—'}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {log.vehicle?.marca} {log.vehicle?.modelo}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {MONTH_LABELS[log.mes - 1]} {log.anio}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {log.kilometraje.toLocaleString('es-AR')} km
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        log.fuente === 'email'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {log.fuente === 'email' ? 'Email' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(log.fecha_registro)}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <DeleteMileageButton
                        id={log.id}
                        label={`${MONTH_LABELS[log.mes - 1]} ${log.anio}`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages} — {total} registros
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
