'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { MileageLog } from '@/types/database'

interface ActionResult {
  error?: string
}

interface GetMileageLogsParams {
  vehicleId?: string
  mes?: number
  anio?: number
  page?: number
  limit?: number
}

interface GetMileageLogsResult {
  data: MileageLog[]
  total: number
  error?: string
}

interface GetLatestResult {
  data: MileageLog | null
  error?: string
}

export async function getMileageLogs(
  params: GetMileageLogsParams = {}
): Promise<GetMileageLogsResult> {
  const { vehicleId, mes, anio, page = 1, limit = 30 } = params
  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const supabase = await createClient()
    let query = supabase
      .from('mileage_logs')
      .select('*, vehicle:vehicles(patente, marca, modelo)', { count: 'exact' })

    if (vehicleId) query = query.eq('vehicle_id', vehicleId)
    if (mes) query = query.eq('mes', mes)
    if (anio) query = query.eq('anio', anio)

    query = query
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, count, error } = await query
    if (error) {
      return { data: [], total: 0, error: error.message }
    }
    return { data: (data as MileageLog[]) ?? [], total: count ?? 0 }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { data: [], total: 0, error: message }
  }
}

export async function getLatestMileage(
  vehicleId: string
): Promise<GetLatestResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('mileage_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .limit(1)
      .maybeSingle<MileageLog>()

    if (error) return { data: null, error: error.message }
    return { data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { data: null, error: message }
  }
}

export async function createMileageLog(
  formData: FormData
): Promise<ActionResult> {
  const vehicle_id = formData.get('vehicle_id')?.toString().trim() ?? ''
  const kilometrajeRaw = formData.get('kilometraje')?.toString().trim() ?? ''
  const mesRaw = formData.get('mes')?.toString().trim() ?? ''
  const anioRaw = formData.get('anio')?.toString().trim() ?? ''
  const fechaRegistro =
    formData.get('fecha_registro')?.toString().trim() ||
    new Date().toISOString().slice(0, 10)

  if (!vehicle_id) return { error: 'El vehículo es requerido.' }
  if (!kilometrajeRaw) return { error: 'El kilometraje es requerido.' }
  if (!mesRaw) return { error: 'El mes es requerido.' }
  if (!anioRaw) return { error: 'El año es requerido.' }

  const kilometraje = parseInt(kilometrajeRaw, 10)
  const mes = parseInt(mesRaw, 10)
  const anio = parseInt(anioRaw, 10)

  if (isNaN(kilometraje) || kilometraje < 0) {
    return { error: 'Kilometraje inválido.' }
  }
  if (isNaN(mes) || mes < 1 || mes > 12) {
    return { error: 'Mes inválido (1-12).' }
  }
  if (isNaN(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) {
    return { error: 'Año inválido.' }
  }

  try {
    const supabase = await createClient()

    // Validate that vehicle exists and is not deleted
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, patente')
      .eq('id', vehicle_id)
      .is('deleted_at', null)
      .single<{ id: string; patente: string }>()

    if (vehicleError || !vehicle) {
      return { error: 'Vehículo inexistente o eliminado.' }
    }

    // Validate that the new mileage is not less than the previous highest record
    const { data: previousLogs } = await supabase
      .from('mileage_logs')
      .select('kilometraje, mes, anio')
      .eq('vehicle_id', vehicle_id)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .limit(5)

    const isLatestMonth = (() => {
      const candidateKey = anio * 100 + mes
      for (const log of previousLogs ?? []) {
        const logKey =
          (log as { anio: number }).anio * 100 + (log as { mes: number }).mes
        if (logKey > candidateKey) return false
      }
      return true
    })()

    if (isLatestMonth && previousLogs && previousLogs.length > 0) {
      const lastKm = (previousLogs[0] as { kilometraje: number }).kilometraje
      if (kilometraje < lastKm) {
        return {
          error: `El kilometraje (${kilometraje.toLocaleString('es-AR')}) es menor al último registrado (${lastKm.toLocaleString('es-AR')}). Verificá el valor.`,
        }
      }
    }

    const { error } = await supabase.from('mileage_logs').insert({
      vehicle_id,
      kilometraje,
      mes,
      anio,
      fecha_registro: fechaRegistro,
      fuente: 'manual',
    })

    if (error) {
      if (error.code === '23505') {
        return {
          error: `Ya existe un registro para ${vehicle.patente} en ${String(mes).padStart(2, '0')}/${anio}. Eliminálo si querés sobrescribirlo.`,
        }
      }
      return { error: error.message }
    }

    revalidatePath('/mileage')
    revalidatePath(`/vehicles/${vehicle_id}`)
    revalidatePath('/dashboard')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function deleteMileageLog(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('mileage_logs')
      .select('vehicle_id')
      .eq('id', id)
      .single<{ vehicle_id: string }>()

    const { error } = await supabase.from('mileage_logs').delete().eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/mileage')
    if (existing?.vehicle_id) {
      revalidatePath(`/vehicles/${existing.vehicle_id}`)
    }
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}
