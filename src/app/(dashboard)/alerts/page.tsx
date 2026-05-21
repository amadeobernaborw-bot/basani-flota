import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Wrench, Calendar, Gauge, Bell, CheckCircle2 } from 'lucide-react'
import { getAlerts, getPendingAlertsCount } from '@/lib/actions/alerts'
import CompleteAlertButton from '@/components/alerts/CompleteAlertButton'
import { createClient } from '@/lib/supabase/server'
import type { Alert, AlertStatus, AlertType } from '@/types/database'

// Icon and color config per alert type
const TIPO_CONFIG: Record<
  AlertType,
  {
    icon: React.ElementType
    label: string
    borderColor: string
    iconColor: string
    iconBg: string
  }
> = {
  vencimiento_documento: {
    icon: AlertTriangle,
    label: 'Vencimiento Documento',
    borderColor: 'border-l-yellow-400',
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-50',
  },
  mantenimiento_pendiente: {
    icon: Wrench,
    label: 'Mantenimiento Pendiente',
    borderColor: 'border-l-purple-400',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
  },
  revision_pendiente: {
    icon: Calendar,
    label: 'Revisión Pendiente',
    borderColor: 'border-l-blue-400',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  error_kilometraje: {
    icon: Gauge,
    label: 'Error Kilometraje',
    borderColor: 'border-l-red-400',
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
  },
}

const ESTADO_OPTIONS: { value: AlertStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'completada', label: 'Completada' },
]

const TIPO_OPTIONS: { value: AlertType | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'vencimiento_documento', label: 'Vencimiento Documento' },
  { value: 'mantenimiento_pendiente', label: 'Mantenimiento Pendiente' },
  { value: 'revision_pendiente', label: 'Revisión Pendiente' },
  { value: 'error_kilometraje', label: 'Error Kilometraje' },
]

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

interface AlertCardProps {
  alert: Alert
  isAdmin: boolean
}

function AlertCard({ alert, isAdmin }: AlertCardProps) {
  const config = TIPO_CONFIG[alert.tipo]
  const Icon = config.icon

  return (
    <div
      className={`flex items-start gap-4 rounded-xl border border-gray-200 border-l-4 ${config.borderColor} bg-white px-5 py-4 shadow-sm`}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}
      >
        <Icon size={18} className={config.iconColor} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">{alert.titulo}</p>
            <p className="mt-0.5 text-xs text-gray-500">{alert.descripcion}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {/* Estado badge */}
            {alert.estado === 'pendiente' ? (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                Pendiente
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Completada
              </span>
            )}

            {/* Complete button — admin only, pendiente only */}
            {isAdmin && alert.estado === 'pendiente' && (
              <CompleteAlertButton id={alert.id} />
            )}
          </div>
        </div>

        {/* Due date */}
        {alert.due_date && (
          <p className="mt-1.5 text-xs text-gray-400">
            Fecha límite: {formatDueDate(alert.due_date)}
          </p>
        )}
      </div>
    </div>
  )
}

interface PageProps {
  searchParams: Promise<{
    estado?: string
    tipo?: string
  }>
}

export default async function AlertsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const estadoParam = (params.estado ?? '') as AlertStatus | ''
  const tipoParam = (params.tipo ?? '') as AlertType | ''

  // Determine user role for admin actions
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
      .single()
    isAdmin = profile?.role === 'admin'
  }

  const [alertsResult, pendingCount] = await Promise.all([
    getAlerts({
      estado: estadoParam || undefined,
      tipo: tipoParam || undefined,
    }),
    getPendingAlertsCount(),
  ])

  const { data: alerts, total } = alertsResult

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          {pendingCount.count > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-semibold text-red-700">
              {pendingCount.count}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {total} {total === 1 ? 'alerta' : 'alertas'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Estado filter */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {ESTADO_OPTIONS.map((opt) => {
            const isActive = estadoParam === opt.value
            const href =
              opt.value === ''
                ? buildUrl('', tipoParam)
                : buildUrl(opt.value, tipoParam)
            return (
              <Link
                key={opt.value}
                href={href}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </Link>
            )
          })}
        </div>

        {/* Tipo filter */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {TIPO_OPTIONS.map((opt) => {
            const isActive = tipoParam === opt.value
            const href =
              opt.value === ''
                ? buildUrl(estadoParam, '')
                : buildUrl(estadoParam, opt.value)
            return (
              <Link
                key={opt.value}
                href={href}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <Bell size={36} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No hay alertas</p>
          <p className="mt-1 text-xs text-gray-400">
            No se encontraron alertas con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}

function buildUrl(estado: AlertStatus | '', tipo: AlertType | ''): string {
  const params = new URLSearchParams()
  if (estado) params.set('estado', estado)
  if (tipo) params.set('tipo', tipo)
  const qs = params.toString()
  return qs ? `/alerts?${qs}` : '/alerts'
}
