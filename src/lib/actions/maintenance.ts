'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  MaintenanceEvent,
  MaintenanceEventStatus,
  MaintenanceRule,
  VehicleCategory,
} from '@/types/database'

interface ActionResult {
  error?: string
}

interface GetEventsParams {
  estado?: MaintenanceEventStatus
  tipo?: 'preventivo' | 'correctivo'
  vehicleId?: string
  search?: string
  page?: number
  limit?: number
}

interface GetEventsResult {
  data: MaintenanceEvent[]
  total: number
  error?: string
}

interface GetEventResult {
  data: MaintenanceEvent | null
  error?: string
}

interface GetRulesResult {
  data: MaintenanceRule[]
  error?: string
}

const VALID_EVENT_TYPES: Array<'preventivo' | 'correctivo'> = ['preventivo', 'correctivo']
const VALID_EVENT_STATES: MaintenanceEventStatus[] = ['pendiente', 'completado', 'vencido']
const VALID_VEHICLE_CATEGORIES: VehicleCategory[] = ['auto', 'camioneta', 'camion']

// ────────────────────────────────────────────────────────────
// MAINTENANCE EVENTS
// ────────────────────────────────────────────────────────────

export async function getMaintenanceEvents(
  params: GetEventsParams = {}
): Promise<GetEventsResult> {
  const { estado, tipo, vehicleId, search, page = 1, limit = 20 } = params
  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const supabase = await createClient()
    let query = supabase
      .from('maintenance_events')
      .select('*, vehicle:vehicles(marca, modelo, patente)', { count: 'exact' })
      .is('deleted_at', null)

    if (estado) query = query.eq('estado', estado)
    if (tipo) query = query.eq('tipo', tipo)
    if (vehicleId) query = query.eq('vehicle_id', vehicleId)
    if (search && search.trim().length > 0) {
      query = query.ilike('descripcion', `%${search.trim()}%`)
    }

    query = query
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, count, error } = await query
    if (error) {
      return { data: [], total: 0, error: error.message }
    }

    return { data: (data as MaintenanceEvent[]) ?? [], total: count ?? 0 }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { data: [], total: 0, error: message }
  }
}

export async function getMaintenanceEvent(id: string): Promise<GetEventResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('maintenance_events')
      .select('*, vehicle:vehicles(marca, modelo, patente)')
      .eq('id', id)
      .is('deleted_at', null)
      .single<MaintenanceEvent>()

    if (error) return { data: null, error: error.message }
    return { data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { data: null, error: message }
  }
}

export async function createMaintenanceEvent(
  formData: FormData
): Promise<ActionResult> {
  const vehicle_id = formData.get('vehicle_id')?.toString().trim() ?? ''
  const tipo = formData.get('tipo')?.toString().trim() ?? ''
  const descripcion = formData.get('descripcion')?.toString().trim() ?? ''
  const fecha = formData.get('fecha')?.toString().trim() ?? ''

  if (!vehicle_id) return { error: 'El vehículo es requerido.' }
  if (!VALID_EVENT_TYPES.includes(tipo as 'preventivo' | 'correctivo')) {
    return { error: 'El tipo es inválido.' }
  }
  if (!descripcion) return { error: 'La descripción es requerida.' }
  if (!fecha) return { error: 'La fecha es requerida.' }

  const kilometrajeRaw = formData.get('kilometraje')?.toString().trim()
  const proximoKmRaw = formData.get('proximo_kilometraje')?.toString().trim()
  const proxRev = formData.get('proxima_revision')?.toString().trim() || null
  const observaciones = formData.get('observaciones')?.toString().trim() || null
  const estadoRaw = formData.get('estado')?.toString().trim() ?? 'pendiente'
  const ruleId = formData.get('rule_id')?.toString().trim() || null

  if (!VALID_EVENT_STATES.includes(estadoRaw as MaintenanceEventStatus)) {
    return { error: 'Estado inválido.' }
  }

  const kilometraje = kilometrajeRaw ? parseInt(kilometrajeRaw, 10) : null
  const proximo_kilometraje = proximoKmRaw ? parseInt(proximoKmRaw, 10) : null

  if (kilometraje !== null && (isNaN(kilometraje) || kilometraje < 0)) {
    return { error: 'Kilometraje inválido.' }
  }
  if (proximo_kilometraje !== null && (isNaN(proximo_kilometraje) || proximo_kilometraje < 0)) {
    return { error: 'Próximo kilometraje inválido.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('maintenance_events').insert({
      vehicle_id,
      rule_id: ruleId,
      tipo: tipo as 'preventivo' | 'correctivo',
      descripcion,
      fecha,
      kilometraje,
      proximo_kilometraje,
      proxima_revision: proxRev,
      observaciones,
      estado: estadoRaw as MaintenanceEventStatus,
    })

    if (error) return { error: error.message }

    revalidatePath('/maintenance')
    revalidatePath(`/vehicles/${vehicle_id}`)
    revalidatePath('/dashboard')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function updateMaintenanceEvent(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const descripcion = formData.get('descripcion')?.toString().trim() ?? ''
  const fecha = formData.get('fecha')?.toString().trim() ?? ''
  const tipo = formData.get('tipo')?.toString().trim() ?? ''

  if (!descripcion) return { error: 'La descripción es requerida.' }
  if (!fecha) return { error: 'La fecha es requerida.' }
  if (!VALID_EVENT_TYPES.includes(tipo as 'preventivo' | 'correctivo')) {
    return { error: 'El tipo es inválido.' }
  }

  const kilometrajeRaw = formData.get('kilometraje')?.toString().trim()
  const proximoKmRaw = formData.get('proximo_kilometraje')?.toString().trim()
  const proxRev = formData.get('proxima_revision')?.toString().trim() || null
  const observaciones = formData.get('observaciones')?.toString().trim() || null
  const estadoRaw = formData.get('estado')?.toString().trim() ?? 'pendiente'

  if (!VALID_EVENT_STATES.includes(estadoRaw as MaintenanceEventStatus)) {
    return { error: 'Estado inválido.' }
  }

  const kilometraje = kilometrajeRaw ? parseInt(kilometrajeRaw, 10) : null
  const proximo_kilometraje = proximoKmRaw ? parseInt(proximoKmRaw, 10) : null

  try {
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('maintenance_events')
      .select('vehicle_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single<{ vehicle_id: string }>()

    const { error } = await supabase
      .from('maintenance_events')
      .update({
        tipo: tipo as 'preventivo' | 'correctivo',
        descripcion,
        fecha,
        kilometraje,
        proximo_kilometraje,
        proxima_revision: proxRev,
        observaciones,
        estado: estadoRaw as MaintenanceEventStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) return { error: error.message }

    revalidatePath('/maintenance')
    if (existing?.vehicle_id) {
      revalidatePath(`/vehicles/${existing.vehicle_id}`)
    }
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function completeMaintenanceEvent(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('maintenance_events')
      .select('vehicle_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single<{ vehicle_id: string }>()

    const { error } = await supabase
      .from('maintenance_events')
      .update({ estado: 'completado', updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) return { error: error.message }

    revalidatePath('/maintenance')
    if (existing?.vehicle_id) {
      revalidatePath(`/vehicles/${existing.vehicle_id}`)
    }
    revalidatePath('/dashboard')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function softDeleteMaintenanceEvent(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('maintenance_events')
      .select('vehicle_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single<{ vehicle_id: string }>()

    const { error } = await supabase
      .from('maintenance_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) return { error: error.message }

    revalidatePath('/maintenance')
    if (existing?.vehicle_id) {
      revalidatePath(`/vehicles/${existing.vehicle_id}`)
    }
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

// ────────────────────────────────────────────────────────────
// MAINTENANCE RULES
// ────────────────────────────────────────────────────────────

interface GetRulesParams {
  vehicleId?: string
  categoria?: VehicleCategory
  scope?: 'global' | 'individual' | 'all'
  includeInactive?: boolean
}

export async function getMaintenanceRules(
  params: GetRulesParams = {}
): Promise<GetRulesResult> {
  const { vehicleId, categoria, scope = 'all', includeInactive = false } = params

  try {
    const supabase = await createClient()
    let query = supabase
      .from('maintenance_rules')
      .select('*')
      .order('is_global', { ascending: false })
      .order('categoria', { ascending: true })
      .order('tipo_mantenimiento', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (scope === 'global') {
      query = query.eq('is_global', true)
    } else if (scope === 'individual') {
      query = query.eq('is_global', false)
      if (vehicleId) query = query.eq('vehicle_id', vehicleId)
    }

    if (categoria) {
      query = query.eq('categoria', categoria)
    }

    const { data, error } = await query
    if (error) return { data: [], error: error.message }
    return { data: (data as MaintenanceRule[]) ?? [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { data: [], error: message }
  }
}

export async function createMaintenanceRule(
  formData: FormData
): Promise<ActionResult> {
  const tipo_mantenimiento = formData.get('tipo_mantenimiento')?.toString().trim() ?? ''
  const descripcion = formData.get('descripcion')?.toString().trim() ?? ''
  const scope = formData.get('scope')?.toString().trim() ?? 'global'
  const categoriaRaw = formData.get('categoria')?.toString().trim() || null
  const vehicleIdRaw = formData.get('vehicle_id')?.toString().trim() || null
  const kmIntervaloRaw = formData.get('km_intervalo')?.toString().trim()
  const diasIntervaloRaw = formData.get('dias_intervalo')?.toString().trim()

  if (!tipo_mantenimiento) return { error: 'El tipo de mantenimiento es requerido.' }
  if (!descripcion) return { error: 'La descripción es requerida.' }

  const isGlobal = scope === 'global'
  let categoria: VehicleCategory | null = null
  let vehicle_id: string | null = null

  if (isGlobal) {
    if (!categoriaRaw || !VALID_VEHICLE_CATEGORIES.includes(categoriaRaw as VehicleCategory)) {
      return { error: 'La categoría es requerida para reglas globales.' }
    }
    categoria = categoriaRaw as VehicleCategory
  } else {
    if (!vehicleIdRaw) {
      return { error: 'El vehículo es requerido para reglas individuales.' }
    }
    vehicle_id = vehicleIdRaw
  }

  const km_intervalo = kmIntervaloRaw ? parseInt(kmIntervaloRaw, 10) : null
  const dias_intervalo = diasIntervaloRaw ? parseInt(diasIntervaloRaw, 10) : null

  if (km_intervalo === null && dias_intervalo === null) {
    return { error: 'Indicá al menos un intervalo (km o días).' }
  }
  if (km_intervalo !== null && (isNaN(km_intervalo) || km_intervalo <= 0)) {
    return { error: 'Intervalo de km inválido.' }
  }
  if (dias_intervalo !== null && (isNaN(dias_intervalo) || dias_intervalo <= 0)) {
    return { error: 'Intervalo de días inválido.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('maintenance_rules').insert({
      tipo_mantenimiento,
      descripcion,
      categoria,
      km_intervalo,
      dias_intervalo,
      is_global: isGlobal,
      vehicle_id,
      is_active: true,
    })

    if (error) return { error: error.message }

    revalidatePath('/settings')
    if (vehicle_id) revalidatePath(`/vehicles/${vehicle_id}`)
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function toggleMaintenanceRuleActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('maintenance_rules')
      .update({ is_active: active })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/settings')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function deleteMaintenanceRule(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('maintenance_rules')
      .delete()
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/settings')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

interface GetActiveVehiclesResult {
  data: Array<{ id: string; patente: string; marca: string; modelo: string; categoria: VehicleCategory }>
  error?: string
}

export async function getActiveVehiclesForMaintenance(): Promise<GetActiveVehiclesResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, patente, marca, modelo, categoria')
      .is('deleted_at', null)
      .neq('estado', 'baja')
      .order('patente', { ascending: true })

    if (error) return { data: [], error: error.message }
    return {
      data: (data as Array<{ id: string; patente: string; marca: string; modelo: string; categoria: VehicleCategory }>) ?? [],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { data: [], error: message }
  }
}
