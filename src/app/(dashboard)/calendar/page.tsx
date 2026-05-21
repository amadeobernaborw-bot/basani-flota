import Link from 'next/link'
import { Calendar as CalendarIcon } from 'lucide-react'
import {
  getCalendarEvents,
  type CalendarEvent,
  type CalendarColor,
} from '@/lib/actions/calendar'
import MonthCalendar from '@/components/dashboard/MonthCalendar'

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
  searchParams: Promise<{ calYear?: string; calMonth?: string }>
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

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams
  const { year, month } = parseParams(params)
  const { events } = await getCalendarEvents(year, month)

  // Group events by day
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const evt of events) {
    const list = eventsByDate.get(evt.date) ?? []
    list.push(evt)
    eventsByDate.set(evt.date, list)
  }
  const sortedDates = Array.from(eventsByDate.keys()).sort()

  const now = new Date()
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vencimientos, mantenimientos, revisiones y alertas del mes.
          </p>
        </div>
        {!isCurrentMonth && (
          <Link
            href={`/calendar?calYear=${now.getFullYear()}&calMonth=${now.getMonth() + 1}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ir al mes actual
          </Link>
        )}
      </div>

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

        {/* Event list */}
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
    </div>
  )
}
