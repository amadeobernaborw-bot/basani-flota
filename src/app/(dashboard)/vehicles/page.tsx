import Link from 'next/link'
import { getVehicles } from '@/lib/actions/vehicles'
import { createClient } from '@/lib/supabase/server'
import type { VehicleCategory, VehicleStatus, Profile } from '@/types/database'
import VehicleListView from '@/components/vehicles/VehicleListView'

interface SearchParams {
  estado?: string
  categoria?: string
  search?: string
  page?: string
  view?: string
}

interface VehiclesPageProps {
  searchParams: Promise<SearchParams>
}

function isVehicleStatus(value: string): value is VehicleStatus {
  return ['activo', 'fuera_de_servicio', 'baja'].includes(value)
}

function isVehicleCategory(value: string): value is VehicleCategory {
  return ['auto', 'camioneta', 'camion'].includes(value)
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  const params = await searchParams
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1
  const estado = params.estado && isVehicleStatus(params.estado) ? params.estado : undefined
  const categoria =
    params.categoria && isVehicleCategory(params.categoria) ? params.categoria : undefined
  const search = params.search?.trim() || undefined
  const viewMode = params.view === 'cards' ? 'cards' : 'table'

  const [{ data: vehicles, total, error }, supabase] = await Promise.all([
    getVehicles({ estado, categoria, search, page, limit: 20 }),
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
      categoria: params.categoria,
      search: params.search,
      page: params.page,
      view: params.view,
      ...updates,
    }
    if (merged.estado) query.set('estado', merged.estado)
    if (merged.categoria) query.set('categoria', merged.categoria)
    if (merged.search) query.set('search', merged.search)
    if (merged.page && merged.page !== '1') query.set('page', merged.page)
    if (merged.view && merged.view !== 'table') query.set('view', merged.view)
    const qs = query.toString()
    return `/vehicles${qs ? `?${qs}` : ''}`
  }

  const tableToggleUrl = buildUrl({ view: 'table', page: '1' })
  const cardsToggleUrl = buildUrl({ view: 'cards', page: '1' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700">
            {total}
          </span>
        </div>
        {isAdmin && (
          <Link
            href="/vehicles/new"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
          >
            Nuevo Vehículo
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" action="/vehicles" className="flex flex-wrap gap-3">
        {params.view && params.view !== 'table' && (
          <input type="hidden" name="view" value={params.view} />
        )}
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Buscar por patente, marca o modelo..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[240px]"
        />
        <select
          name="estado"
          defaultValue={estado ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="fuera_de_servicio">Fuera de servicio</option>
          <option value="baja">Baja</option>
        </select>
        <select
          name="categoria"
          defaultValue={categoria ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Todas las categorías</option>
          <option value="auto">Auto</option>
          <option value="camioneta">Camioneta</option>
          <option value="camion">Camión</option>
        </select>
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
        >
          Filtrar
        </button>
        {(search || estado || categoria) && (
          <Link
            href={buildUrl({ search: undefined, estado: undefined, categoria: undefined, page: '1' })}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error al cargar vehículos: {error}
        </div>
      )}

      {/* List / Cards */}
      {vehicles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No se encontraron vehículos</p>
            <p className="mt-1 text-xs text-gray-400">
              {search || estado || categoria
                ? 'Intente ajustar los filtros de búsqueda.'
                : 'Comience agregando un nuevo vehículo.'}
            </p>
          </div>
        </div>
      ) : (
        <VehicleListView
          vehicles={vehicles}
          isAdmin={isAdmin}
          viewMode={viewMode}
          tableToggleUrl={tableToggleUrl}
          cardsToggleUrl={cardsToggleUrl}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages} — {total} vehículos
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
