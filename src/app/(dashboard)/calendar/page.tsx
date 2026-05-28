import Link from 'next/link'
import { Calendar as CalendarIcon, CalendarDays, LayoutList } from 'lucide-react'
import {
  getCalendarEvents,
  getUpcomingEvents,
  type CalendarEvent,
  type CalendarColor,
} from '@/lib/actions/calendar'
import MonthCalendar from '@/components/dashboard/MonthCalendar'
import UpcomingCardsView from '@/components/dashboard/UpcomingCardsView'

const MONTH_NAMES = [
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

const DOT_CLASS: Record<CalendarColor, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400',
}

interface CalendarPageProps {
  searchParams: Promise<{ calYear?: string; calMonth?: string; view?: string }>
}

function parseParams(params: {
  calYear?: string
  calMonth?: string
}): { year: number; month: number } {
  const now = new Date()
  const parsedYear = params.calYear ? parseInt(params.calYear, 10) : NaN
  const parsedMonth = params.calMonth ? parseInt(params.calMonth, 10) : NaN
  const year =
    Number.isFinite(parsedYear) && parsedYear >= 1970 && parsedYear <= 2100
      ? parsedYear
      : now.getFullYear()
  const month =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : now.getMonth() + 1
  return { year, month }
}

function formatDateLong(iso: string): string {
  const date = new Date(iso + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams
  const isCardView = params.view === 'cards'
  const { year, month } = parseParams(params)

  const now = new Date()
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1
  const today = now.toISOString().slice(0, 10)

  let events: CalendarEvent[] = []
  if (isCardView) {
    const result = await getUpcomingEvents(today, addDays(today, 90))
    events = result.events
  } else {
    const result = await getCalendarEvents(year, month)
    events = result.events
  }

  // Group events by day (used in grid sidebar)
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const evt of events) {
    const list = eventsByDate.get(evt.date) ?? []
    list.push(evt)
    eventsByDate.set(evt.date, list)
  }
  const sortedDates = Array.from(eventsByDate.keys()).sort()

  const gridCalYear = year
  const gridCalMonth = month

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isCardView
              ? 'Próximos vencimientos y eventos — los 90 días siguientes.'
              : 'Vencimientos, mantenimientos, revisiones y alertas del mes.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <Link
              href={`/calendar?calYear=${gridCalYear}&calMonth=${gridCalMonth}`}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                !isCardView
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CalendarDays size={15} />
              <span className="hidden sm:inline">Mes</span>
            </Link>
            <Link
              href="/calendar?view=cards"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-gray-200 ${
                isCardView
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutList size={15} />
              <span className="hidden sm:inline">Próximos</span>
            </Link>
          </div>

          {/* "Go to current month" button — only in grid view when not current month */}
          {!isCardView && !isCurrentMonth && (
            <Link
              href={`/calendar?calYear=${now.getFullYear()}&calMonth=${now.getMonth() + 1}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Ir al mes actual
            </Link>
          )}
        </div>
      </div>

      {/* Card timeline view */}
      {isCardView ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            {events.length} evento{events.length === 1 ? '' : 's'} en los próximos 90 días
          </p>
          <UpcomingCardsView events={events} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar grid */}
          <div className="lg:col-span-2">
            <MonthCalendar
              year={year}
              month={month}
              events={events}
              basePath="/calendar"
            />
          </div>

          {/* Event list sidebar */}
          <aside className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Eventos de {MONTH_NAMES[month - 1]}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {events.length} evento{events.length === 1 ? '' : 's'} en el mes
              </p>
            </div>

            {sortedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <CalendarIcon size={28} className="mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  No hay eventos este mes
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Probá navegar a otro mes con las flechas del calendario.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
                {sortedDates.map((date) => {
                  const dayEvents = eventsByDate.get(date) ?? []
                  return (
                    <li key={date} className="px-4 py-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 capitalize">
                        {formatDateLong(date)}
                      </p>
                      <ul className="space-y-1.5">
                        {dayEvents.map((evt, i) => (
                          <li key={`${date}-${i}`}>
                            <Link
                              href={evt.href}
                              className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                            >
                              <span
                                className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[evt.color]}`}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium text-gray-900">
                                  {evt.title}
                                </span>
                                <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                                  {evt.type === 'doc_vencimiento'
                                    ? 'Vencimiento'
                                    : evt.type === 'mantenimiento'
                                      ? 'Mantenimiento'
                                      : evt.type === 'revision'
                                        ? 'Revisión'
                                        : 'Alerta'}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
