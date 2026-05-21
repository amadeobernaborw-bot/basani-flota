'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Employee, EmployeeCategory, EmployeeStatus } from '@/types/database'

interface GetEmployeesParams {
  estado?: EmployeeStatus
  categoria?: EmployeeCategory
  search?: string
  page?: number
  limit?: number
}

interface GetEmployeesResult {
  data: Employee[]
  total: number
  error?: string
}

interface ActionResult {
  error?: string
}

export async function getEmployees(
  params: GetEmployeesParams = {}
): Promise<GetEmployeesResult> {
  const { estado, categoria, search, page = 1, limit = 20 } = params
  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const supabase = await createClient()

    let query = supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true })
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
        `nombre.ilike.%${term}%,apellido.ilike.%${term}%,dni.ilike.%${term}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return { data: [], total: 0, error: error.message }
    }

    return { data: (data as Employee[]) ?? [], total: count ?? 0 }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: [], total: 0, error: message }
  }
}

interface GetEmployeeResult {
  data: Employee | null
  error?: string
}

export async function getEmployee(id: string): Promise<GetEmployeeResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single<Employee>()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: null, error: message }
  }
}

export async function createEmployee(formData: FormData): Promise<ActionResult> {
  const nombre = formData.get('nombre')?.toString().trim() ?? ''
  const apellido = formData.get('apellido')?.toString().trim() ?? ''
  const dni = formData.get('dni')?.toString().trim() ?? ''
  const categoria = formData.get('categoria')?.toString().trim() ?? ''
  const fecha_ingreso = formData.get('fecha_ingreso')?.toString().trim() ?? ''

  if (!nombre) return { error: 'El nombre es requerido.' }
  if (!apellido) return { error: 'El apellido es requerido.' }
  if (!dni) return { error: 'El DNI es requerido.' }
  if (!categoria) return { error: 'La categoría es requerida.' }
  if (!fecha_ingreso) return { error: 'La fecha de ingreso es requerida.' }

  const validCategories: EmployeeCategory[] = ['operario', 'camionero', 'administrativo']
  if (!validCategories.includes(categoria as EmployeeCategory)) {
    return { error: 'Categoría inválida.' }
  }

  const validStatuses: EmployeeStatus[] = ['activo', 'suspendido', 'baja']
  const estadoRaw = formData.get('estado')?.toString().trim() ?? 'activo'
  if (!validStatuses.includes(estadoRaw as EmployeeStatus)) {
    return { error: 'Estado inválido.' }
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase.from('employees').insert({
      nombre,
      apellido,
      dni,
      cuil: formData.get('cuil')?.toString().trim() || null,
      fecha_nacimiento: formData.get('fecha_nacimiento')?.toString().trim() || null,
      direccion: formData.get('direccion')?.toString().trim() || null,
      telefono: formData.get('telefono')?.toString().trim() || null,
      email: formData.get('email')?.toString().trim() || null,
      contacto_emergencia: formData.get('contacto_emergencia')?.toString().trim() || null,
      categoria: categoria as EmployeeCategory,
      fecha_ingreso,
      fecha_egreso: formData.get('fecha_egreso')?.toString().trim() || null,
      estado: estadoRaw as EmployeeStatus,
      observaciones: formData.get('observaciones')?.toString().trim() || null,
    })

    if (error) {
      if (error.code === '23505') {
        return { error: 'Ya existe un empleado con ese DNI.' }
      }
      return { error: error.message }
    }

    revalidatePath('/employees')
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

export async function updateEmployee(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const nombre = formData.get('nombre')?.toString().trim() ?? ''
  const apellido = formData.get('apellido')?.toString().trim() ?? ''
  const dni = formData.get('dni')?.toString().trim() ?? ''
  const categoria = formData.get('categoria')?.toString().trim() ?? ''
  const fecha_ingreso = formData.get('fecha_ingreso')?.toString().trim() ?? ''

  if (!nombre) return { error: 'El nombre es requerido.' }
  if (!apellido) return { error: 'El apellido es requerido.' }
  if (!dni) return { error: 'El DNI es requerido.' }
  if (!categoria) return { error: 'La categoría es requerida.' }
  if (!fecha_ingreso) return { error: 'La fecha de ingreso es requerida.' }

  const validCategories: EmployeeCategory[] = ['operario', 'camionero', 'administrativo']
  if (!validCategories.includes(categoria as EmployeeCategory)) {
    return { error: 'Categoría inválida.' }
  }

  const validStatuses: EmployeeStatus[] = ['activo', 'suspendido', 'baja']
  const estadoRaw = formData.get('estado')?.toString().trim() ?? 'activo'
  if (!validStatuses.includes(estadoRaw as EmployeeStatus)) {
    return { error: 'Estado inválido.' }
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('employees')
      .update({
        nombre,
        apellido,
        dni,
        cuil: formData.get('cuil')?.toString().trim() || null,
        fecha_nacimiento: formData.get('fecha_nacimiento')?.toString().trim() || null,
        direccion: formData.get('direccion')?.toString().trim() || null,
        telefono: formData.get('telefono')?.toString().trim() || null,
        email: formData.get('email')?.toString().trim() || null,
        contacto_emergencia: formData.get('contacto_emergencia')?.toString().trim() || null,
        categoria: categoria as EmployeeCategory,
        fecha_ingreso,
        fecha_egreso: formData.get('fecha_egreso')?.toString().trim() || null,
        estado: estadoRaw as EmployeeStatus,
        observaciones: formData.get('observaciones')?.toString().trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) {
      if (error.code === '23505') {
        return { error: 'Ya existe un empleado con ese DNI.' }
      }
      return { error: error.message }
    }

    revalidatePath('/employees')
    revalidatePath(`/employees/${id}`)
    revalidatePath(`/employees/${id}/edit`)
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

export async function softDeleteEmployee(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('employees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/employees')
    revalidatePath(`/employees/${id}`)
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

export async function restoreEmployee(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('employees')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/employees')
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}
