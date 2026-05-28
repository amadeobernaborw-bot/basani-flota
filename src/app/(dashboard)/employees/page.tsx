import Link from 'next/link'
import { getEmployees } from '@/lib/actions/employees'
import { createClient } from '@/lib/supabase/server'
import type { EmployeeCategory, EmployeeStatus, Profile } from '@/types/database'
import EmployeeListView from '@/components/employees/EmployeeListView'

interface SearchParams {
  estado?: string
  categoria?: string
  search?: string
  page?: string
  view?: string
}

interface EmployeesPageProps {
  searchParams: Promise<SearchParams>
}

function isEmployeeStatus(value: string): value is EmployeeStatus {
  return ['activo', 'suspendido', 'baja'].includes(value)
}

function isEmployeeCategory(value: string): value is EmployeeCategory {
  return ['operario', 'camionero', 'administrativo'].includes(value)
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1
  const estado = params.estado && isEmployeeStatus(params.estado) ? params.estado : undefined
  const categoria = params.categoria && isEmployeeCategory(params.categoria) ? params.categoria : undefined
  const search = params.search?.trim() || undefined
  const viewMode = params.view === 'cards' ? 'cards' : 'table'

  const [{ data: employees, total, error }, supabase] = await Promise.all([
    getEmployees({ estado, categoria, search, page, limit: 20 }),
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
    return `/employees${qs ? `?${qs}` : ''}`
  }

  const tableToggleUrl = buildUrl({ view: 'table', page: '1' })
  const cardsToggleUrl = buildUrl({ view: 'cards', page: '1' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700">
            {total}
          </span>
        </div>
        {isAdmin && (
          <Link
            href="/employees/new"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
          >
            Nuevo Empleado
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" action="/employees" className="flex flex-wrap gap-3">
        {params.view && params.view !== 'table' && (
          <input type="hidden" name="view" value={params.view} />
        )}
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Buscar por nombre, apellido o DNI..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[220px]"
        />
        <select
          name="estado"
          defaultValue={estado ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
          <option value="baja">Baja</option>
        </select>
        <select
          name="categoria"
          defaultValue={categoria ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Todas las categorías</option>
          <option value="operario">Operario</option>
          <option value="camionero">Camionero</option>
          <option value="administrativo">Administrativo</option>
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
          Error al cargar empleados: {error}
        </div>
      )}

      {/* List / Cards */}
      {employees.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No se encontraron empleados</p>
            <p className="mt-1 text-xs text-gray-400">
              {search || estado || categoria
                ? 'Intente ajustar los filtros de búsqueda.'
                : 'Comience agregando un nuevo empleado.'}
            </p>
          </div>
        </div>
      ) : (
        <EmployeeListView
          employees={employees}
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
            Página {page} de {totalPages} — {total} empleados
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
