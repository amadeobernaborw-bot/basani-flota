'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  TRASH_RETENTION_DAYS,
  type TrashEntityType,
  type TrashedItem,
} from '@/lib/actions/trash-types'

interface GetTrashedItemsResult {
  items: TrashedItem[]
  error?: string
}

interface ActionResult {
  error?: string
}

interface CleanupResult {
  deleted: number
  error?: string
}

function daysRemaining(deletedAt: string): number {
  const deletedTime = new Date(deletedAt).getTime()
  const expiresTime = deletedTime + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const remainingMs = expiresTime - Date.now()
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
}

export async function getTrashedItems(): Promise<GetTrashedItemsResult> {
  try {
    const supabase = await createClient()

    const [employees, vehicles, empDocs, vehDocs, maintEvents] = await Promise.all([
      supabase
        .from('employees')
        .select('id, nombre, apellido, dni, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),

      supabase
        .from('vehicles')
        .select('id, marca, modelo, patente, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),

      supabase
        .from('employee_documents')
        .select(
          'id, deleted_at, employee:employees(nombre, apellido), document_type:document_types(nombre)'
        )
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),

      supabase
        .from('vehicle_documents')
        .select(
          'id, deleted_at, vehicle:vehicles(patente), document_type:document_types(nombre)'
        )
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),

      supabase
        .from('maintenance_events')
        .select(
          'id, descripcion, fecha, deleted_at, vehicle:vehicles(patente)'
        )
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
    ])

    const items: TrashedItem[] = []

    for (const emp of employees.data ?? []) {
      const row = emp as {
        id: string
        nombre: string
        apellido: string
        dni: string
        deleted_at: string
      }
      items.push({
        id: row.id,
        entity_type: 'employee',
        label: `${row.apellido}, ${row.nombre}`,
        sublabel: `DNI ${row.dni}`,
        deleted_at: row.deleted_at,
        days_remaining: daysRemaining(row.deleted_at),
      })
    }

    for (const veh of vehicles.data ?? []) {
      const row = veh as {
        id: string
        marca: string
        modelo: string
        patente: string
        deleted_at: string
      }
      items.push({
        id: row.id,
        entity_type: 'vehicle',
        label: row.patente,
        sublabel: `${row.marca} ${row.modelo}`,
        deleted_at: row.deleted_at,
        days_remaining: daysRemaining(row.deleted_at),
      })
    }

    for (const doc of empDocs.data ?? []) {
      const row = doc as {
        id: string
        deleted_at: string
        employee?: { nombre?: string; apellido?: string }
        document_type?: { nombre?: string }
      }
      const docName = row.document_type?.nombre ?? 'Documento'
      const empName = row.employee
        ? `${row.employee.apellido}, ${row.employee.nombre}`
        : 'Empleado'
      items.push({
        id: row.id,
        entity_type: 'employee_document',
        label: `${docName} — ${empName}`,
        sublabel: 'Documento de empleado',
        deleted_at: row.deleted_at,
        days_remaining: daysRemaining(row.deleted_at),
      })
    }

    for (const doc of vehDocs.data ?? []) {
      const row = doc as {
        id: string
        deleted_at: string
        vehicle?: { patente?: string }
        document_type?: { nombre?: string }
      }
      const docName = row.document_type?.nombre ?? 'Documento'
      const patente = row.vehicle?.patente ?? 'Vehículo'
      items.push({
        id: row.id,
        entity_type: 'vehicle_document',
        label: `${docName} — ${patente}`,
        sublabel: 'Documento de vehículo',
        deleted_at: row.deleted_at,
        days_remaining: daysRemaining(row.deleted_at),
      })
    }

    for (const evt of maintEvents.data ?? []) {
      const row = evt as {
        id: string
        descripcion: string
        fecha: string | null
        deleted_at: string
        vehicle?: { patente?: string }
      }
      const patente = row.vehicle?.patente ?? 'Vehículo'
      items.push({
        id: row.id,
        entity_type: 'maintenance_event',
        label: row.descripcion,
        sublabel: `${patente}${row.fecha ? ` · ${row.fecha}` : ''}`,
        deleted_at: row.deleted_at,
        days_remaining: daysRemaining(row.deleted_at),
      })
    }

    items.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at))

    return { items }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { items: [], error: message }
  }
}

function tableFor(type: TrashEntityType): string {
  switch (type) {
    case 'employee':
      return 'employees'
    case 'vehicle':
      return 'vehicles'
    case 'employee_document':
      return 'employee_documents'
    case 'vehicle_document':
      return 'vehicle_documents'
    case 'maintenance_event':
      return 'maintenance_events'
  }
}

function fileTableFor(type: TrashEntityType): string | null {
  if (type === 'employee_document') return 'employee_document_files'
  if (type === 'vehicle_document') return 'vehicle_document_files'
  return null
}

export async function restoreTrashedItem(
  type: TrashEntityType,
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const table = tableFor(type)

    // Documents: restoring should also reset is_current and demote any current version
    if (type === 'employee_document' || type === 'vehicle_document') {
      const { data: doc, error: fetchError } = await supabase
        .from(table)
        .select(
          type === 'employee_document'
            ? 'id, employee_id, type_id'
            : 'id, vehicle_id, type_id'
        )
        .eq('id', id)
        .single()

      if (fetchError || !doc) {
        return { error: fetchError?.message ?? 'No se encontró el documento.' }
      }

      const idField = type === 'employee_document' ? 'employee_id' : 'vehicle_id'
      const entityId = (doc as Record<string, string>)[idField]
      const typeId = (doc as { type_id: string }).type_id

      // Demote any current version for the same type/entity
      await supabase
        .from(table)
        .update({ is_current: false, updated_at: new Date().toISOString() })
        .eq(idField, entityId)
        .eq('type_id', typeId)
        .eq('is_current', true)
        .is('deleted_at', null)

      const { error: restoreError } = await supabase
        .from(table)
        .update({
          deleted_at: null,
          is_current: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (restoreError) {
        return { error: restoreError.message }
      }

      revalidatePath('/trash')
      revalidatePath(
        type === 'employee_document'
          ? `/employees/${entityId}`
          : `/vehicles/${entityId}`
      )
      return {}
    }

    // Employees/vehicles/maintenance events: simple restore
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/trash')
    if (type === 'employee') revalidatePath('/employees')
    else if (type === 'vehicle') revalidatePath('/vehicles')
    else if (type === 'maintenance_event') {
      revalidatePath('/maintenance')
      revalidatePath('/dashboard')
    }
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

async function deleteStorageFilesForDocument(
  type: 'employee_document' | 'vehicle_document',
  documentId: string
): Promise<void> {
  const supabase = await createClient()
  const fileTable = fileTableFor(type)
  if (!fileTable) return

  const { data: files } = await supabase
    .from(fileTable)
    .select('storage_path')
    .eq('document_id', documentId)

  const paths = (files ?? [])
    .map((f) => (f as { storage_path: string }).storage_path)
    .filter(Boolean)

  if (paths.length > 0) {
    await supabase.storage.from('documents').remove(paths)
  }
}

async function deleteStorageFilesForEntity(
  type: 'employee' | 'vehicle',
  entityId: string
): Promise<void> {
  const supabase = await createClient()
  const docTable = type === 'employee' ? 'employee_documents' : 'vehicle_documents'
  const fileTable = type === 'employee' ? 'employee_document_files' : 'vehicle_document_files'
  const idField = type === 'employee' ? 'employee_id' : 'vehicle_id'

  const { data: docs } = await supabase
    .from(docTable)
    .select('id')
    .eq(idField, entityId)

  const docIds = (docs ?? []).map((d) => (d as { id: string }).id)
  if (docIds.length === 0) return

  const { data: files } = await supabase
    .from(fileTable)
    .select('storage_path')
    .in('document_id', docIds)

  const paths = (files ?? [])
    .map((f) => (f as { storage_path: string }).storage_path)
    .filter(Boolean)

  if (paths.length > 0) {
    await supabase.storage.from('documents').remove(paths)
  }
}

export async function permanentlyDeleteItem(
  type: TrashEntityType,
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const table = tableFor(type)

    // Delete physical files from storage first to avoid orphans
    if (type === 'employee_document' || type === 'vehicle_document') {
      await deleteStorageFilesForDocument(type, id)
    } else if (type === 'employee' || type === 'vehicle') {
      await deleteStorageFilesForEntity(type, id)
    }

    // DB cascade handles related rows (files, documents)
    const { error } = await supabase.from(table).delete().eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/trash')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function cleanupExpiredTrash(): Promise<CleanupResult> {
  try {
    const { items, error } = await getTrashedItems()
    if (error) {
      return { deleted: 0, error }
    }

    const expired = items.filter((item) => item.days_remaining === 0)
    let deleted = 0

    for (const item of expired) {
      const result = await permanentlyDeleteItem(item.entity_type, item.id)
      if (!result.error) {
        deleted += 1
      }
    }

    revalidatePath('/trash')
    return { deleted }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { deleted: 0, error: message }
  }
}
