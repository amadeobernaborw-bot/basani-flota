import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Wrench } from 'lucide-react'
import { getMaintenanceEvents } from '@/lib/actions/maintenance'
import { createClient } from '@/lib/supabase/server'
import CompleteMaintenanceButton from '@/components/maintenance/CompleteMaintenanceButton'
import type {
  MaintenanceEvent,
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

const TIPO_LABELS: Record<'preventivo' | 'correctivo', string> = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
}

const TIPO_CLASSES: Record<'preventivo' | 'correctivo', string> = {
  preventivo: 'bg-green-100 text-green-800',
  correctivo: 'bg-orange-100 text-orange-800',
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

function isValidEstado(v: string): v is MaintenanceEventStatus {
  return ['pendiente', 'completado', 'vencido'].includes(v)
}

function isValidTipo(v: string): v is 'preventivo' | 'correctivo' {
  return ['preventivo', 'correctivo'].includes(v)
}

interface SearchParams {
  estado?: string
  tipo?: string
  search?: string
  page?: string
}

interface MaintenancePageProps {
  searchParams: Promise<SearchParams>
}

export default async function MaintenancePage({
  searchParams,
}: MaintenancePageProps) {
  const params = await searchParams
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1
  const estado = params.estado && isValidEstado(params.estado) ? params.estado : undefined
  const tipo = params.tipo && isValidTipo(params.tipo) ? params.tipo : undefined
  const search = params.search?.trim() || undefined

  const [{ data: events, total, error }, supabase] = await Promise.all([
    getMaintenanceEvents({ estado, tipo, search, page, limit: 20 }),
    createClient(),
  ])

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

  const totalPages = Math.ceil(total / 20)

  function buildUrl(updates: Partial<SearchParams>): string {
    const query = new URLSearchParams()
    const merged = {
      estado: params.estado,
      tipo: params.tipo,
      search: params.search,
      page: params.page,
      ...updates,
    }
    if (merged.estado) query.set('estado', merged.estado)
    if (merged.tipo) query.set('tipo', merged.tipo)
    if (merged.search) query.set('search', merged.search)
    if (merged.page && merged.page !== '1') query.set('page', merged.page)
    const qs = query.toString()
    return `/maintenance${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Mantenimiento</h1>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700">
            {total}
          </span>
        </div>
        {isAdmin && (
          <Link
            href="/maintenance/new"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
          >
            Nuevo evento
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" action="/maintenance" className="flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Buscar por descripción..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[220px]"
        />
        <select
          name="estado"
          defaultValue={estado ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="completado">Completado</option>
          <option value="vencido">Vencido</option>
        </select>
        <select
          name="tipo"
          defaultValue={tipo ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Todos los tipos</option>
          <option value="preventivo">Preventivo</option>
          <option value="correctivo">Correctivo</option>
        </select>
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
        >
          Filtrar
        </button>
        {(search || estado || tipo) && (
          <Link
            href="/maintenance"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wrench size={32} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              No se encontraron eventos de mantenimiento
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {search || estado || tipo
                ? 'Intente ajustar los filtros.'
                : 'Comience registrando un nuevo evento.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Vehículo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">KM</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Próx. revisión</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt: MaintenanceEvent) => (
                <tr
                  key={evt.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/vehicles/${evt.vehicle_id}`}
                      className="font-medium text-gray-900 hover:text-gray-600"
                    >
                      {evt.vehicle?.patente ?? '—'}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {evt.vehicle?.marca} {evt.vehicle?.modelo}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[260px]">
                    <p className="truncate">{evt.descripcion}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_CLASSES[evt.tipo]}`}
                    >
                      {TIPO_LABELS[evt.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(evt.fecha)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {evt.kilometraje ? evt.kilometraje.toLocaleString('es-AR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(evt.proxima_revision)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASSES[evt.estado]}`}
                    >
                      {ESTADO_LABELS[evt.estado]}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages} — {total} eventos
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
