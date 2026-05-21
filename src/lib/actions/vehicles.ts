'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Vehicle,
  VehicleCategory,
  VehicleStatus,
  VehicleDriverHistory,
  Employee,
} from '@/types/database'

interface GetVehiclesParams {
  estado?: VehicleStatus
  categoria?: VehicleCategory
  search?: string
  page?: number
  limit?: number
}

interface GetVehiclesResult {
  data: Vehicle[]
  total: number
  error?: string
}

interface GetVehicleResult {
  data: Vehicle | null
  error?: string
}

interface ActionResult {
  error?: string
}

interface AddDriverHistoryResult {
  error?: string
  id?: string
}

interface GetDriverHistoryResult {
  data: VehicleDriverHistory[]
  error?: string
}

interface GetActiveEmployeesResult {
  data: Pick<Employee, 'id' | 'nombre' | 'apellido' | 'dni'>[]
  error?: string
}

const VALID_CATEGORIES: VehicleCategory[] = ['auto', 'camioneta', 'camion']
const VALID_STATUSES: VehicleStatus[] = ['activo', 'fuera_de_servicio', 'baja']

export async function getVehicles(
  params: GetVehiclesParams = {}
): Promise<GetVehiclesResult> {
  const { estado, categoria, search, page = 1, limit = 20 } = params
  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const supabase = await createClient()

    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('marca', { ascending: true })
      .order('modelo', { ascending: true })
      .range(from, to)

    if (estado) {
      query = query.eq('estado', estado)
    }

    if (categoria) {
      query = query.eq('categoria', categoria)
    }

    if (search && search.trim().length > 0) {
      const term = search.trim()
      query = query.or(
        `marca.ilike.%${term}%,modelo.ilike.%${term}%,patente.ilike.%${term}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return { data: [], total: 0, error: error.message }
    }

    return { data: (data as Vehicle[]) ?? [], total: count ?? 0 }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: [], total: 0, error: message }
  }
}

export async function getVehicle(id: string): Promise<GetVehicleResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single<Vehicle>()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: null, error: message }
  }
}

export async function createVehicle(formData: FormData): Promise<ActionResult> {
  const marca = formData.get('marca')?.toString().trim() ?? ''
  const modelo = formData.get('modelo')?.toString().trim() ?? ''
  const anioRaw = formData.get('anio')?.toString().trim() ?? ''
  const patente = formData.get('patente')?.toString().trim().toUpperCase() ?? ''
  const categoria = formData.get('categoria')?.toString().trim() ?? ''

  if (!marca) return { error: 'La marca es requerida.' }
  if (!modelo) return { error: 'El modelo es requerido.' }
  if (!anioRaw) return { error: 'El año es requerido.' }
  if (!patente) return { error: 'La patente es requerida.' }
  if (!categoria) return { error: 'La categoría es requerida.' }

  const anio = parseInt(anioRaw, 10)
  if (isNaN(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) {
    return { error: 'El año debe ser un número válido.' }
  }

  if (!VALID_CATEGORIES.includes(categoria as VehicleCategory)) {
    return { error: 'Categoría inválida.' }
  }

  const estadoRaw = formData.get('estado')?.toString().trim() ?? 'activo'
  if (!VALID_STATUSES.includes(estadoRaw as VehicleStatus)) {
    return { error: 'Estado inválido.' }
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase.from('vehicles').insert({
      marca,
      modelo,
      anio,
      patente,
      chasis: formData.get('chasis')?.toString().trim() || null,
      motor: formData.get('motor')?.toString().trim() || null,
      categoria: categoria as VehicleCategory,
      estado: estadoRaw as VehicleStatus,
      observaciones: formData.get('observaciones')?.toString().trim() || null,
    })

    if (error) {
      if (error.code === '23505') {
        return { error: 'Ya existe un vehículo con esa patente.' }
      }
      return { error: error.message }
    }

    revalidatePath('/vehicles')
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

export async function updateVehicle(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const marca = formData.get('marca')?.toString().trim() ?? ''
  const modelo = formData.get('modelo')?.toString().trim() ?? ''
  const anioRaw = formData.get('anio')?.toString().trim() ?? ''
  const patente = formData.get('patente')?.toString().trim().toUpperCase() ?? ''
  const categoria = formData.get('categoria')?.toString().trim() ?? ''

  if (!marca) return { error: 'La marca es requerida.' }
  if (!modelo) return { error: 'El modelo es requerido.' }
  if (!anioRaw) return { error: 'El año es requerido.' }
  if (!patente) return { error: 'La patente es requerida.' }
  if (!categoria) return { error: 'La categoría es requerida.' }

  const anio = parseInt(anioRaw, 10)
  if (isNaN(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) {
    return { error: 'El año debe ser un número válido.' }
  }

  if (!VALID_CATEGORIES.includes(categoria as VehicleCategory)) {
    return { error: 'Categoría inválida.' }
  }

  const estadoRaw = formData.get('estado')?.toString().trim() ?? 'activo'
  if (!VALID_STATUSES.includes(estadoRaw as VehicleStatus)) {
    return { error: 'Estado inválido.' }
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('vehicles')
      .update({
        marca,
        modelo,
        anio,
        patente,
        chasis: formData.get('chasis')?.toString().trim() || null,
        motor: formData.get('motor')?.toString().trim() || null,
        categoria: categoria as VehicleCategory,
        estado: estadoRaw as VehicleStatus,
        observaciones: formData.get('observaciones')?.toString().trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) {
      if (error.code === '23505') {
        return { error: 'Ya existe un vehículo con esa patente.' }
      }
      return { error: error.message }
    }

    revalidatePath('/vehicles')
    revalidatePath(`/vehicles/${id}`)
    revalidatePath(`/vehicles/${id}/edit`)
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

export async function softDeleteVehicle(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('vehicles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/vehicles')
    revalidatePath(`/vehicles/${id}`)
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

export async function getDriverHistory(
  vehicleId: string
): Promise<GetDriverHistoryResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vehicle_driver_history')
      .select('*, employee:employees(nombre, apellido, dni)')
      .eq('vehicle_id', vehicleId)
      .order('fecha_inicio', { ascending: false })

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: (data as VehicleDriverHistory[]) ?? [] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: [], error: message }
  }
}

export async function addDriverHistory(
  vehicleId: string,
  formData: FormData
): Promise<AddDriverHistoryResult> {
  const employee_id = formData.get('employee_id')?.toString().trim() ?? ''
  const fecha_inicio = formData.get('fecha_inicio')?.toString().trim() ?? ''

  if (!employee_id) return { error: 'El empleado es requerido.' }
  if (!fecha_inicio) return { error: 'La fecha de inicio es requerida.' }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vehicle_driver_history')
      .insert({
        vehicle_id: vehicleId,
        employee_id,
        fecha_inicio,
        fecha_fin: formData.get('fecha_fin')?.toString().trim() || null,
        observaciones: formData.get('observaciones')?.toString().trim() || null,
      })
      .select('id')
      .single<{ id: string }>()

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/vehicles/${vehicleId}`)
    return { id: data.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

export async function getActiveEmployees(): Promise<GetActiveEmployeesResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido, dni')
      .eq('estado', 'activo')
      .is('deleted_at', null)
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }

    return {
      data: (data as Pick<Employee, 'id' | 'nombre' | 'apellido' | 'dni'>[]) ?? [],
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: [], error: message }
  }
}
