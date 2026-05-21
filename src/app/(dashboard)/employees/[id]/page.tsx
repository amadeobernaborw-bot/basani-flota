import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEmployee } from '@/lib/actions/employees'
import { createClient } from '@/lib/supabase/server'
import DeleteEmployeeButton from '@/components/employees/DeleteEmployeeButton'
import EmployeeDocumentsTab from '@/components/employees/EmployeeDocumentsTab'
import ConsolidatedPdfButton from '@/components/shared/ConsolidatedPdfButton'
import type { EmployeeStatus, EmployeeCategory, Profile } from '@/types/database'

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

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: EmployeeDetailPageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab === 'documentos' ? 'documentos' : 'info'

  const { data: employee, error } = await getEmployee(id)

  if (error || !employee) {
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

  const tabBase = `/employees/${id}`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/employees"
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          >
            ← Empleados
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.nombre} {employee.apellido}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASSES[employee.estado]}`}
            >
              {ESTADO_LABELS[employee.estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            DNI {employee.dni} — {CATEGORIA_LABELS[employee.categoria]}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ConsolidatedPdfButton entityType="employee" entityId={id} />
          {isAdmin && (
            <>
              <Link
                href={`/employees/${id}/edit`}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Editar
              </Link>
              <DeleteEmployeeButton id={id} />
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
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Datos Personales */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-5 pb-2 border-b border-gray-100">
              Datos Personales
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Nombre" value={employee.nombre} />
              <InfoField label="Apellido" value={employee.apellido} />
              <InfoField label="DNI" value={employee.dni} />
              <InfoField label="CUIL" value={employee.cuil} />
              <InfoField
                label="Fecha de nacimiento"
                value={formatDate(employee.fecha_nacimiento)}
              />
              <InfoField label="Teléfono" value={employee.telefono} />
              <InfoField label="Email" value={employee.email} />
              <InfoField
                label="Contacto de emergencia"
                value={employee.contacto_emergencia}
              />
              <div className="sm:col-span-2">
                <InfoField label="Dirección" value={employee.direccion} />
              </div>
            </dl>
          </div>

          {/* Datos Laborales */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-5 pb-2 border-b border-gray-100">
              Datos Laborales
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField
                label="Categoría"
                value={CATEGORIA_LABELS[employee.categoria]}
              />
              <InfoField
                label="Estado"
                value={ESTADO_LABELS[employee.estado]}
              />
              <InfoField
                label="Fecha de ingreso"
                value={formatDate(employee.fecha_ingreso)}
              />
              <InfoField
                label="Fecha de egreso"
                value={formatDate(employee.fecha_egreso)}
              />
              <div className="sm:col-span-2">
                <InfoField label="Observaciones" value={employee.observaciones} />
              </div>
              <InfoField
                label="Registrado"
                value={formatDate(employee.created_at)}
              />
              <InfoField
                label="Última modificación"
                value={formatDate(employee.updated_at)}
              />
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <EmployeeDocumentsTab employeeId={id} isAdmin={isAdmin} />
        </div>
      )}
    </div>
  )
}
