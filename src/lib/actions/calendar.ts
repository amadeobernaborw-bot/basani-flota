'use server'

import { createClient } from '@/lib/supabase/server'

export type CalendarEventType =
  | 'doc_vencimiento'
  | 'mantenimiento'
  | 'revision'
  | 'alerta'

export type CalendarColor = 'red' | 'yellow' | 'green' | 'blue' | 'gray'

export interface CalendarEvent {
  date: string
  type: CalendarEventType
  title: string
  color: CalendarColor
  href: string
}

interface GetCalendarEventsResult {
  events: CalendarEvent[]
  error?: string
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + 'T00:00:00Z').getTime()
  const to = new Date(toIso + 'T00:00:00Z').getTime()
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

function colorForExpiry(today: string, dueDate: string): CalendarColor {
  const diff = daysBetween(today, dueDate)
  if (diff < 0) return 'red'
  if (diff < 7) return 'red'
  if (diff < 30) return 'yellow'
  return 'green'
}

export async function getCalendarEvents(
  year: number,
  month: number
): Promise<GetCalendarEventsResult> {
  const m = pad2(month)
  const startIso = `${year}-${m}-01`
  const endIso = `${year}-${m}-${pad2(lastDayOfMonth(year, month))}`
  const today = new Date().toISOString().slice(0, 10)

  try {
    const supabase = await createClient()

    const [empDocs, vehDocs, mEvents, alerts] = await Promise.all([
      supabase
        .from('employee_documents')
        .select(
          'id, employee_id, fecha_vencimiento, document_type:document_types(nombre), employee:employees(nombre, apellido)'
        )
        .eq('is_current', true)
        .is('deleted_at', null)
        .eq('sin_vencimiento', false)
        .gte('fecha_vencimiento', startIso)
        .lte('fecha_vencimiento', endIso),

      supabase
        .from('vehicle_documents')
        .select(
          'id, vehicle_id, fecha_vencimiento, document_type:document_types(nombre), vehicle:vehicles(patente)'
        )
        .eq('is_current', true)
        .is('deleted_at', null)
        .eq('sin_vencimiento', false)
        .gte('fecha_vencimiento', startIso)
        .lte('fecha_vencimiento', endIso),

      supabase
        .from('maintenance_events')
        .select(
          'id, vehicle_id, fecha, proxima_revision, descripcion, estado, vehicle:vehicles(patente)'
        )
        .is('deleted_at', null)
        .or(
          `and(fecha.gte.${startIso},fecha.lte.${endIso}),and(proxima_revision.gte.${startIso},proxima_revision.lte.${endIso})`
        ),

      supabase
        .from('alerts')
        .select('id, tipo, titulo, due_date, estado, entity_type, entity_id')
        .eq('estado', 'pendiente')
        .gte('due_date', startIso)
        .lte('due_date', endIso),
    ])

    const events: CalendarEvent[] = []

    for (const doc of empDocs.data ?? []) {
      const fecha = (doc as { fecha_vencimiento: string | null }).fecha_vencimiento
      if (!fecha) continue
      const typeName =
        (doc as { document_type?: { nombre?: string } }).document_type?.nombre ?? 'Documento'
      const emp = (doc as { employee?: { nombre?: string; apellido?: string } }).employee
      const empName = emp ? `${emp.apellido}, ${emp.nombre}` : 'Empleado'
      events.push({
        date: fecha,
        type: 'doc_vencimiento',
        title: `${typeName} — ${empName}`,
        color: colorForExpiry(today, fecha),
        href: `/employees/${(doc as { employee_id: string }).employee_id}?tab=documentos`,
      })
    }

    for (const doc of vehDocs.data ?? []) {
      const fecha = (doc as { fecha_vencimiento: string | null }).fecha_vencimiento
      if (!fecha) continue
      const typeName =
        (doc as { document_type?: { nombre?: string } }).document_type?.nombre ?? 'Documento'
      const veh = (doc as { vehicle?: { patente?: string } }).vehicle
      const patente = veh?.patente ?? 'Vehículo'
      events.push({
        date: fecha,
        type: 'doc_vencimiento',
        title: `${typeName} — ${patente}`,
        color: colorForExpiry(today, fecha),
        href: `/vehicles/${(doc as { vehicle_id: string }).vehicle_id}?tab=documentos`,
      })
    }

    for (const evt of mEvents.data ?? []) {
      const fecha = (evt as { fecha: string | null }).fecha
      const proxima = (evt as { proxima_revision: string | null }).proxima_revision
      const descripcion = (evt as { descripcion: string }).descripcion
      const estado = (evt as { estado: string }).estado
      const veh = (evt as { vehicle?: { patente?: string } }).vehicle
      const patente = veh?.patente ?? 'Vehículo'
      const vehicleId = (evt as { vehicle_id: string }).vehicle_id

      if (fecha && fecha >= startIso && fecha <= endIso) {
        events.push({
          date: fecha,
          type: 'mantenimiento',
          title: `${descripcion} — ${patente}`,
          color: estado === 'completado' ? 'blue' : 'gray',
          href: `/vehicles/${vehicleId}`,
        })
      }
      if (proxima && proxima >= startIso && proxima <= endIso) {
        events.push({
          date: proxima,
          type: 'revision',
          title: `Próx. revisión: ${descripcion} — ${patente}`,
          color: colorForExpiry(today, proxima),
          href: `/vehicles/${vehicleId}`,
        })
      }
    }

    for (const alert of alerts.data ?? []) {
      const dueDate = (alert as { due_date: string | null }).due_date
      if (!dueDate) continue
      events.push({
        date: dueDate,
        type: 'alerta',
        title: (alert as { titulo: string }).titulo,
        color: colorForExpiry(today, dueDate),
        href: `/alerts`,
      })
    }

    events.sort((a, b) => a.date.localeCompare(b.date))

    return { events }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { events: [], error: message }
  }
}
