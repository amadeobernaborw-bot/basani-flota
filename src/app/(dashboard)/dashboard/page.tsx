import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Users,
  Truck,
  Clock,
  AlertTriangle,
  XCircle,
  Wrench,
  Bell,
  Calendar,
  CalendarDays,
  LayoutList,
  Gauge,
  Settings,
  CheckCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCalendarEvents, getUpcomingEvents } from '@/lib/actions/calendar'
import MonthCalendar from '@/components/dashboard/MonthCalendar'
import UpcomingCardsView from '@/components/dashboard/UpcomingCardsView'
import type { Alert, AlertType } from '@/types/database'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrentDate(): string {
  return format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
}

function formatAlertDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

const ALERT_TIPO_LABELS: Record<AlertType, string> = {
  vencimiento_documento: 'Vencimiento',
  mantenimiento_pendiente: 'Mantenimiento',
  revision_pendiente: 'Revisión',
  error_kilometraje: 'Kilometraje',
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  href?: string
}

function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  href,
}: MetricCardProps) {
  const card = (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          {href && (
            <span className="mt-2 inline-block text-xs font-medium text-gray-400 transition-colors hover:text-gray-600">
              Ver todos →
            </span>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{card}</Link>
  }

  return card
}

interface QuickLinkProps {
  title: string
  description: string
  href: string
  icon: React.ElementType
}

function QuickLink({ title, description, href, icon: Icon }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <Icon size={20} className="text-gray-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </Link>
  )
}

// ── Data fetching ─────────────────────────────────────────────────────────────

interface DashboardMetrics {
  activeEmployees: number
  activeVehicles: number
  expiringDocuments: number
  expiredDocuments: number
  vehiclesOutOfService: number
  pendingMaintenance: number
  recentAlerts: Alert[]
}

async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient()

  const now = new Date()
  const nowIso = now.toISOString()
  const in30DaysIso = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: activeEmployees },
    { count: activeVehicles },
    { count: empExpiring },
    { count: vehExpiring },
    { count: empExpired },
    { count: vehExpired },
    { count: vehiclesOutOfService },
    { count: pendingMaintenance },
    { data: recentAlerts },
  ] = await Promise.all([
    // 1. Active employees
    supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('estado', 'activo'),

    // 2. Active vehicles
    supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('estado', 'activo'),

    // 3. Employee docs expiring in next 30 days
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true)
      .is('deleted_at', null)
      .eq('sin_vencimiento', false)
      .gte('fecha_vencimiento', nowIso)
      .lte('fecha_vencimiento', in30DaysIso),

    // 4. Vehicle docs expiring in next 30 days
    supabase
      .from('vehicle_documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true)
      .is('deleted_at', null)
      .eq('sin_vencimiento', false)
      .gte('fecha_vencimiento', nowIso)
      .lte('fecha_vencimiento', in30DaysIso),

    // 5. Employee docs already expired
    supabase
      .from('employee_documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true)
      .is('deleted_at', null)
      .eq('sin_vencimiento', false)
      .lt('fecha_vencimiento', nowIso),

    // 6. Vehicle docs already expired
    supabase
      .from('vehicle_documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true)
      .is('deleted_at', null)
      .eq('sin_vencimiento', false)
      .lt('fecha_vencimiento', nowIso),

    // 7. Vehicles out of service
    supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('estado', 'fuera_de_servicio'),

    // 8. Pending maintenance events
    supabase
      .from('maintenance_events')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('estado', 'pendiente'),

    // 9. Top 5 pending alerts
    supabase
      .from('alerts')
      .select('*')
      .eq('estado', 'pendiente')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5),
  ])

  return {
    activeEmployees: activeEmployees ?? 0,
    activeVehicles: activeVehicles ?? 0,
    expiringDocuments: (empExpiring ?? 0) + (vehExpiring ?? 0),
    expiredDocuments: (empExpired ?? 0) + (vehExpired ?? 0),
    vehiclesOutOfService: vehiclesOutOfService ?? 0,
    pendingMaintenance: pendingMaintenance ?? 0,
    recentAlerts: (recentAlerts as Alert[]) ?? [],
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface DashboardPageProps {
  searchParams: Promise<{ calYear?: string; calMonth?: string; view?: string }>
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function parseCalendarParams(
  params: { calYear?: string; calMonth?: string }
): { year: number; month: number } {
  const now = new Date()
  const fallbackYear = now.getFullYear()
  const fallbackMonth = now.getMonth() + 1

  const parsedYear = params.calYear ? parseInt(params.calYear, 10) : NaN
  const parsedMonth = params.calMonth ? parseInt(params.calMonth, 10) : NaN

  const year = Number.isFinite(parsedYear) && parsedYear >= 1970 && parsedYear <= 2100
    ? parsedYear
    : fallbackYear
  const month = Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
    ? parsedMonth
    : fallbackMonth

  return { year, month }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const isCardView = params.view === 'cards'
  const { year, month } = parseCalendarParams(params)

  const today = new Date().toISOString().slice(0, 10)

  const [metrics, calendarData] = await Promise.all([
    getDashboardMetrics(),
    isCardView
      ? getUpcomingEvents(today, addDays(today, 90))
      : getCalendarEvents(year, month),
  ])
  const calendar = calendarData

  const metricCards: MetricCardProps[] = [
    {
      title: 'Empleados activos',
      value: metrics.activeEmployees,
      icon: Users,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      href: '/employees?estado=activo',
    },
    {
      title: 'Vehículos activos',
      value: metrics.activeVehicles,
      icon: Truck,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      href: '/vehicles?estado=activo',
    },
    {
      title: 'Próx. 30 días',
      value: metrics.expiringDocuments,
      icon: Clock,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-50',
      href: '/employees',
    },
    {
      title: 'Documentos vencidos',
      value: metrics.expiredDocuments,
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
    },
    {
      title: 'Fuera de servicio',
      value: metrics.vehiclesOutOfService,
      icon: XCircle,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      href: '/vehicles?estado=fuera_de_servicio',
    },
    {
      title: 'Mantenimientos pendientes',
      value: metrics.pendingMaintenance,
      icon: Wrench,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      href: '/maintenance',
    },
  ]

  const quickLinks: QuickLinkProps[] = [
    {
      title: 'Empleados',
      description: 'Gestionar personal y documentos',
      href: '/employees',
      icon: Users,
    },
    {
      title: 'Vehículos',
      description: 'Gestionar flota y documentación',
      href: '/vehicles',
      icon: Truck,
    },
    {
      title: 'Mantenimiento',
      description: 'Registros y revisiones',
      href: '/maintenance',
      icon: Wrench,
    },
    {
      title: 'Kilometraje',
      description: 'Carga mensual y validación',
      href: '/mileage',
      icon: Gauge,
    },
    {
      title: 'Calendario',
      description: 'Vista mensual de eventos',
      href: '/calendar',
      icon: Calendar,
    },
    {
      title: 'Alertas',
      description: 'Vencimientos y pendientes',
      href: '/alerts',
      icon: Bell,
    },
    {
      title: 'Configuración',
      description: 'Tipos, reglas, emails',
      href: '/settings',
      icon: Settings,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm capitalize text-gray-500">
          {formatCurrentDate()}
        </p>
      </div>

      {/* Metric cards */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Métricas generales
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metricCards.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </section>

      {/* Calendar */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Calendario
          </h2>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <Link
              href={`/dashboard?calYear=${year}&calMonth=${month}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                !isCardView
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CalendarDays size={13} />
              <span>Mes</span>
            </Link>
            <Link
              href="/dashboard?view=cards"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors border-l border-gray-200 ${
                isCardView
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutList size={13} />
              <span>Próximos</span>
            </Link>
          </div>
        </div>
        {isCardView ? (
          <UpcomingCardsView events={calendar.events} />
        ) : (
          <MonthCalendar
            year={year}
            month={month}
            events={calendar.events}
          />
        )}
      </section>

      {/* Recent alerts */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Alertas recientes
          </h2>
          <Link
            href="/alerts"
            className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-800"
          >
            Ver todas las alertas →
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {metrics.recentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle size={32} className="mb-3 text-green-300" />
              <p className="text-sm font-medium text-gray-500">
                No hay alertas pendientes
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Todo está al día.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {metrics.recentAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {alert.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {ALERT_TIPO_LABELS[alert.tipo]}
                    </p>
                  </div>
                  {alert.due_date && (
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatAlertDate(alert.due_date)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick access */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <QuickLink key={link.href} {...link} />
          ))}
        </div>
      </section>
    </div>
  )
}
