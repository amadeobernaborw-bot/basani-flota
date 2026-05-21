'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Alert, AlertStatus, AlertType } from '@/types/database'

interface GetAlertsParams {
  estado?: AlertStatus
  tipo?: AlertType
  page?: number
  limit?: number
}

interface GetAlertsResult {
  data: Alert[]
  total: number
  error?: string
}

interface ActionResult {
  error?: string
}

export async function getAlerts(
  params: GetAlertsParams = {}
): Promise<GetAlertsResult> {
  const { estado, tipo, page = 1, limit = 50 } = params
  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const supabase = await createClient()

    let query = supabase
      .from('alerts')
      .select('*', { count: 'exact' })

    if (estado) {
      query = query.eq('estado', estado)
    }

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    query = query
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, count, error } = await query

    if (error) {
      return { data: [], total: 0, error: error.message }
    }

    return { data: (data as Alert[]) ?? [], total: count ?? 0 }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { data: [], total: 0, error: message }
  }
}

export async function getPendingAlertsCount(): Promise<{ count: number }> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')

    if (error) {
      return { count: 0 }
    }

    return { count: count ?? 0 }
  } catch {
    return { count: 0 }
  }
}

export async function completeAlert(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('alerts')
      .update({
        estado: 'completada',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/alerts')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function generateAlertsFromDocuments(): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Fetch employee documents expiring within 30 days or already past
    const { data: employeeDocs, error: empError } = await supabase
      .from('employee_documents')
      .select('id, employee_id, fecha_vencimiento, type_id, document_type:document_types(nombre)')
      .eq('is_current', true)
      .is('deleted_at', null)
      .eq('sin_vencimiento', false)
      .lte('fecha_vencimiento', in30Days.toISOString())
      .not('fecha_vencimiento', 'is', null)

    if (empError) {
      return { error: empError.message }
    }

    // Fetch vehicle documents expiring within 30 days or already past
    const { data: vehicleDocs, error: vehError } = await supabase
      .from('vehicle_documents')
      .select('id, vehicle_id, fecha_vencimiento, type_id, document_type:document_types(nombre)')
      .eq('is_current', true)
      .is('deleted_at', null)
      .eq('sin_vencimiento', false)
      .lte('fecha_vencimiento', in30Days.toISOString())
      .not('fecha_vencimiento', 'is', null)

    if (vehError) {
      return { error: vehError.message }
    }

    // Fetch existing pending alerts to avoid duplicates
    const { data: existingAlerts } = await supabase
      .from('alerts')
      .select('entity_id')
      .eq('estado', 'pendiente')
      .eq('tipo', 'vencimiento_documento')

    const existingEntityIds = new Set(
      (existingAlerts ?? []).map((a: { entity_id: string }) => a.entity_id)
    )

    const alertsToInsert: {
      tipo: AlertType
      entity_type: 'employee' | 'vehicle'
      entity_id: string
      titulo: string
      descripcion: string
      estado: AlertStatus
      due_date: string | null
    }[] = []

    for (const doc of employeeDocs ?? []) {
      if (existingEntityIds.has(doc.id)) continue

      const typeName =
        doc.document_type && typeof doc.document_type === 'object' && 'nombre' in doc.document_type
          ? (doc.document_type as { nombre: string }).nombre
          : 'Documento'

      const fechaVenc = doc.fecha_vencimiento as string | null
      const isPast = fechaVenc ? new Date(fechaVenc) < now : false

      alertsToInsert.push({
        tipo: 'vencimiento_documento',
        entity_type: 'employee',
        entity_id: doc.id,
        titulo: `${typeName} - Empleado`,
        descripcion: isPast
          ? `El documento ${typeName} ha vencido.`
          : `El documento ${typeName} vence pronto.`,
        estado: 'pendiente',
        due_date: fechaVenc,
      })
    }

    for (const doc of vehicleDocs ?? []) {
      if (existingEntityIds.has(doc.id)) continue

      const typeName =
        doc.document_type && typeof doc.document_type === 'object' && 'nombre' in doc.document_type
          ? (doc.document_type as { nombre: string }).nombre
          : 'Documento'

      const fechaVenc = doc.fecha_vencimiento as string | null
      const isPast = fechaVenc ? new Date(fechaVenc) < now : false

      alertsToInsert.push({
        tipo: 'vencimiento_documento',
        entity_type: 'vehicle',
        entity_id: doc.id,
        titulo: `${typeName} - Vehículo`,
        descripcion: isPast
          ? `El documento ${typeName} ha vencido.`
          : `El documento ${typeName} vence pronto.`,
        estado: 'pendiente',
        due_date: fechaVenc,
      })
    }

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('alerts')
        .insert(alertsToInsert)

      if (insertError) {
        return { error: insertError.message }
      }
    }

    revalidatePath('/alerts')
    revalidatePath('/dashboard')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}
