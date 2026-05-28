import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import type { CalendarEvent, CalendarColor } from '@/lib/actions/calendar'

const COLOR_BORDER: Record<CalendarColor, string> = {
  red: 'border-l-red-500',
  yellow: 'border-l-yellow-400',
  green: 'border-l-green-500',
  blue: 'border-l-blue-500',
  gray: 'border-l-gray-300',
}

const COLOR_DOT: Record<CalendarColor, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400',
}

const TYPE_LABEL: Record<CalendarEvent['type'], string> = {
  doc_vencimiento: 'Vencimiento',
  mantenimiento: 'Mantenimiento',
  revision: 'Revisión',
  alerta: 'Alerta',
}

function formatDateHeader(iso: string): { day: string; month: string; weekday: string } {
  const date = new Date(iso + 'T00:00:00')
  return {
    day: date.toLocaleDateString('es-AR', { day: '2-digit' }),
    month: date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
    weekday: date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
  }
}

function isToday(iso: string): boolean {
  return iso === new Date().toISOString().slice(0, 10)
}

interface Props {
  events: CalendarEvent[]
}

export default function UpcomingCardsView({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
        <CalendarDays size={32} className="mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Sin eventos próximos</p>
        <p className="mt-1 text-xs text-gray-400">No hay vencimientos ni eventos en los próximos 90 días.</p>
      </div>
    )
  }

  // Group events by date
  const grouped = new Map<string, CalendarEvent[]>()
  for (const evt of events) {
    const list = grouped.get(evt.date) ?? []
    list.push(evt)
    grouped.set(evt.date, list)
  }
  const sortedDates = Array.from(grouped.keys()).sort()

  return (
    <div
      className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-1 px-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      {sortedDates.map((date) => {
        const dayEvents = grouped.get(date) ?? []
        const { day, month, weekday } = formatDateHeader(date)
        const today = isToday(date)

        return (
          <div
            key={date}
            className="snap-start shrink-0 w-60 flex flex-col gap-2"
          >
            {/* Date header */}
            <div
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                today ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="text-2xl font-bold leading-none">{day}</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {month}
                </span>
                <span className={`text-[10px] capitalize ${today ? 'text-gray-300' : 'text-gray-500'}`}>
                  {today ? 'Hoy' : weekday}
                </span>
              </div>
            </div>

            {/* Event cards for this date */}
            <div className="flex flex-col gap-2">
              {dayEvents.map((evt, i) => (
                <Link
                  key={`${date}-${i}`}
                  href={evt.href}
                  className={`block rounded-lg border border-gray-200 border-l-4 bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md ${COLOR_BORDER[evt.color]}`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${COLOR_DOT[evt.color]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900 leading-snug">
                        {evt.title}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                        {TYPE_LABEL[evt.type]}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
