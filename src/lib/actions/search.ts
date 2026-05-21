'use server'

import { createClient } from '@/lib/supabase/server'

export type SearchResultType =
  | 'employee'
  | 'vehicle'
  | 'employee_document'
  | 'vehicle_document'

export interface SearchResult {
  type: SearchResultType
  id: string
  label: string
  sublabel: string
  href: string
}

interface GlobalSearchResult {
  results: SearchResult[]
  error?: string
}

const PER_TYPE_LIMIT = 6

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const term = query.trim()
  if (term.length < 2) {
    return { results: [] }
  }

  try {
    const supabase = await createClient()
    const like = `%${term}%`

    const [employees, vehicles, empDocs, vehDocs] = await Promise.all([
      supabase
        .from('employees')
        .select('id, nombre, apellido, dni, categoria, observaciones')
        .is('deleted_at', null)
        .or(
          `nombre.ilike.${like},apellido.ilike.${like},dni.ilike.${like},observaciones.ilike.${like}`
        )
        .limit(PER_TYPE_LIMIT),

      supabase
        .from('vehicles')
        .select('id, marca, modelo, patente, categoria, observaciones')
        .is('deleted_at', null)
        .or(
          `marca.ilike.${like},modelo.ilike.${like},patente.ilike.${like},observaciones.ilike.${like}`
        )
        .limit(PER_TYPE_LIMIT),

      supabase
        .from('employee_documents')
        .select(
          'id, employee_id, numero, observaciones, comentarios, employee:employees(nombre, apellido), document_type:document_types(nombre)'
        )
        .eq('is_current', true)
        .is('deleted_at', null)
        .or(
          `numero.ilike.${like},observaciones.ilike.${like},comentarios.ilike.${like}`
        )
        .limit(PER_TYPE_LIMIT),

      supabase
        .from('vehicle_documents')
        .select(
          'id, vehicle_id, numero, observaciones, comentarios, vehicle:vehicles(patente), document_type:document_types(nombre)'
        )
        .eq('is_current', true)
        .is('deleted_at', null)
        .or(
          `numero.ilike.${like},observaciones.ilike.${like},comentarios.ilike.${like}`
        )
        .limit(PER_TYPE_LIMIT),
    ])

    const results: SearchResult[] = []

    for (const emp of employees.data ?? []) {
      const row = emp as {
        id: string
        nombre: string
        apellido: string
        dni: string
        categoria: string
      }
      results.push({
        type: 'employee',
        id: row.id,
        label: `${row.apellido}, ${row.nombre}`,
        sublabel: `DNI ${row.dni} · ${row.categoria}`,
        href: `/employees/${row.id}`,
      })
    }

    for (const veh of vehicles.data ?? []) {
      const row = veh as {
        id: string
        marca: string
        modelo: string
        patente: string
        categoria: string
      }
      results.push({
        type: 'vehicle',
        id: row.id,
        label: row.patente,
        sublabel: `${row.marca} ${row.modelo} · ${row.categoria}`,
        href: `/vehicles/${row.id}`,
      })
    }

    for (const doc of empDocs.data ?? []) {
      const row = doc as {
        id: string
        employee_id: string
        numero: string | null
        employee?: { nombre?: string; apellido?: string }
        document_type?: { nombre?: string }
      }
      const docName = row.document_type?.nombre ?? 'Documento'
      const empName = row.employee
        ? `${row.employee.apellido}, ${row.employee.nombre}`
        : 'Empleado'
      results.push({
        type: 'employee_document',
        id: row.id,
        label: `${docName}${row.numero ? ` N° ${row.numero}` : ''}`,
        sublabel: empName,
        href: `/employees/${row.employee_id}?tab=documentos`,
      })
    }

    for (const doc of vehDocs.data ?? []) {
      const row = doc as {
        id: string
        vehicle_id: string
        numero: string | null
        vehicle?: { patente?: string }
        document_type?: { nombre?: string }
      }
      const docName = row.document_type?.nombre ?? 'Documento'
      const patente = row.vehicle?.patente ?? 'Vehículo'
      results.push({
        type: 'vehicle_document',
        id: row.id,
        label: `${docName}${row.numero ? ` N° ${row.numero}` : ''}`,
        sublabel: patente,
        href: `/vehicles/${row.vehicle_id}?tab=documentos`,
      })
    }

    return { results }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { results: [], error: message }
  }
}
