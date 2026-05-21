import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEvent, CalendarColor } from '@/lib/actions/calendar'

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

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const CHIP_CLASSES: Record<CalendarColor, string> = {
  red: 'bg-red-100 text-red-800 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function isoFor(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const m = month + delta
  if (m < 1) return { year: year - 1, month: 12 }
  if (m > 12) return { year: year + 1, month: 1 }
  return { year, month: m }
}

function getMondayOffset(year: number, month: number): number {
  // JS: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const firstDow = new Date(year, month - 1, 1).getDay()
  return (firstDow + 6) % 7
}

function lastDayOf(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

interface DayCellProps {
  day: number
  isToday: boolean
  events: CalendarEvent[]
}

function DayCell({ day, isToday, events }: DayCellProps) {
  const visible = events.slice(0, 3)
  const overflow = events.length - visible.length

  return (
    <div className="min-h-[88px] border border-gray-100 bg-white p-1.5 flex flex-col gap-1">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center text-xs font-semibold ${
          isToday
            ? 'rounded-full bg-gray-900 text-white'
            : 'text-gray-600'
        }`}
      >
        {day}
      </span>
      <div className="flex flex-col gap-0.5">
        {visible.map((evt, i) => (
          <Link
            key={`${evt.type}-${i}-${evt.title}`}
            href={evt.href}
            title={evt.title}
            className={`block truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight hover:opacity-80 ${CHIP_CLASSES[evt.color]}`}
          >
            {evt.title}
          </Link>
        ))}
        {overflow > 0 && (
          <span className="text-[10px] text-gray-400 px-1">+{overflow} más</span>
        )}
      </div>
    </div>
  )
}

interface MonthCalendarProps {
  year: number
  month: number
  events: CalendarEvent[]
  basePath?: string
}

export default function MonthCalendar({
  year,
  month,
  events,
  basePath = '/dashboard',
}: MonthCalendarProps) {
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const todayY = today.getFullYear()
  const todayM = today.getMonth() + 1
  const todayD = today.getDate()

  const offset = getMondayOffset(year, month)
  const totalDays = lastDayOf(year, month)
  const totalCells = Math.ceil((offset + totalDays) / 7) * 7

  const eventsByDay = new Map<string, CalendarEvent[]>()
  for (const evt of events) {
    const list = eventsByDay.get(evt.date) ?? []
    list.push(evt)
    eventsByDay.set(evt.date, list)
  }

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)

  const buildHref = (y: number, m: number) =>
    `${basePath}?calYear=${y}&calMonth=${m}`

  const isCurrentMonth = year === todayY && month === todayM

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <Link
              href={buildHref(todayY, todayM)}
              className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Hoy
            </Link>
          )}
          <Link
            href={buildHref(prev.year, prev.month)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={14} />
          </Link>
          <Link
            href={buildHref(next.year, next.month)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNumber = i - offset + 1
          if (dayNumber < 1 || dayNumber > totalDays) {
            return (
              <div
                key={i}
                className="min-h-[88px] border border-gray-100 bg-gray-50"
              />
            )
          }
          const iso = isoFor(year, month, dayNumber)
          const dayEvents = eventsByDay.get(iso) ?? []
          const isToday =
            year === todayY && month === todayM && dayNumber === todayD
          return (
            <DayCell
              key={iso}
              day={dayNumber}
              isToday={isToday || iso === todayIso}
              events={dayEvents}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 bg-gray-50 px-4 py-2 text-[10px] text-gray-600">
        <LegendDot color="red" label="Vencido / crítico" />
        <LegendDot color="yellow" label="Próximo (≤30 días)" />
        <LegendDot color="green" label="Vigente" />
        <LegendDot color="blue" label="Completado / revisado" />
        <LegendDot color="gray" label="Programado" />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: CalendarColor; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${CHIP_CLASSES[color].split(' ')[0]}`}
      />
      {label}
    </span>
  )
}
