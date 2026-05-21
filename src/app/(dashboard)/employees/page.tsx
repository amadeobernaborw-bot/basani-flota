import Link from 'next/link'
import { getEmployees } from '@/lib/actions/employees'
import { createClient } from '@/lib/supabase/server'
import type { EmployeeCategory, EmployeeStatus, Profile } from '@/types/database'
import type { Employee } from '@/types/database'

const ESTADO_LABELS: Record<EmployeeStatus, string> = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  baja: 'Baja',
}

const ESTADO_CLASSES: Record<EmployeeStatus, string> = {
  activo: 'bg-green-100 text-green-800',
  suspendido: 'bg-yellow-100 text-yellow-800',
  baja: 'bg-red-100 text-red-800',
}

const CATEGORIA_LABELS: Record<EmployeeCategory, string> = {
  operario: 'Operario',
  camionero: 'Camionero',
  administrativo: 'Administrativo',
}

interface SearchParams {
  estado?: string
  categoria?: string
  search?: string
  page?: string
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

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function EmployeeRow({ employee }: { employee: Employee }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {employee.apellido}, {employee.nombre}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{employee.dni}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {CATEGORIA_LABELS[employee.categoria]}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASSES[employee.estado]}`}
        >
          {ESTADO_LABELS[employee.estado]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {formatDate(employee.fecha_ingreso)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/employees/${employee.id}`}
          className="text-sm font-medium text-gray-900 hover:text-gray-600"
        >
          Ver
        </Link>
      </td>
    </tr>
  )
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1
  const estado = params.estado && isEmployeeStatus(params.estado) ? params.estado : undefined
  const categoria = params.categoria && isEmployeeCategory(params.categoria) ? params.categoria : undefined
  const search = params.search?.trim() || undefined

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
    const merged = { estado: params.estado, categoria: params.categoria, search: params.search, page: params.page, ...updates }
    if (merged.estado) query.set('estado', merged.estado)
    if (merged.categoria) query.set('categoria', merged.categoria)
    if (merged.search) query.set('search', merged.search)
    if (merged.page && merged.page !== '1') query.set('page', merged.page)
    const qs = query.toString()
    return `/employees${qs ? `?${qs}` : ''}`
  }

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
            href="/employees"
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

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No se encontraron empleados</p>
            <p className="mt-1 text-xs text-gray-400">
              {search || estado || categoria
                ? 'Intente ajustar los filtros de búsqueda.'
                : 'Comience agregando un nuevo empleado.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Nombre / Apellido
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  DNI
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fecha ingreso
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <EmployeeRow key={employee.id} employee={employee} />
              ))}
            </tbody>
          </table>
        )}
      </div>

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
