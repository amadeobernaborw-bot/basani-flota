'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import type {
  DocumentType,
  DocumentAppliesTo,
  EmployeeDocument,
  EmployeeDocumentFile,
  VehicleDocument,
  VehicleDocumentFile,
} from '@/types/database'

export type DocumentEntityType = 'employee' | 'vehicle'

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function getDocumentTable(entityType: DocumentEntityType) {
  return entityType === 'employee' ? 'employee_documents' : 'vehicle_documents'
}

function getFileTable(entityType: DocumentEntityType) {
  return entityType === 'employee'
    ? 'employee_document_files'
    : 'vehicle_document_files'
}

function getEntityIdField(entityType: DocumentEntityType) {
  return entityType === 'employee' ? 'employee_id' : 'vehicle_id'
}

function getRevalidationPaths(entityType: DocumentEntityType, entityId: string) {
  const base = entityType === 'employee' ? '/employees' : '/vehicles'
  return [`${base}/${entityId}`]
}

// ─── getDocuments ────────────────────────────────────────────────────────────

interface GetDocumentsResult {
  data: EmployeeDocument[] | VehicleDocument[]
  error?: string
}

export async function getDocuments(
  entityType: DocumentEntityType,
  entityId: string
): Promise<GetDocumentsResult> {
  try {
    const supabase = await createClient()
    const table = getDocumentTable(entityType)
    const idField = getEntityIdField(entityType)

    const { data, error } = await supabase
      .from(table)
      .select('*, document_type:document_types(*)')
      .eq(idField, entityId)
      .eq('is_current', true)
      .is('deleted_at', null)
      .order('document_type(orden)', { ascending: true })
      .order('document_type(nombre)', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: (data as EmployeeDocument[] | VehicleDocument[]) ?? [] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: [], error: message }
  }
}

// ─── getDocumentHistory ──────────────────────────────────────────────────────

interface GetDocumentHistoryResult {
  data: EmployeeDocument[] | VehicleDocument[]
  error?: string
}

export async function getDocumentHistory(
  documentTypeId: string,
  entityId: string,
  entityType: DocumentEntityType
): Promise<GetDocumentHistoryResult> {
  try {
    const supabase = await createClient()
    const table = getDocumentTable(entityType)
    const idField = getEntityIdField(entityType)

    const { data, error } = await supabase
      .from(table)
      .select('*, document_type:document_types(*)')
      .eq(idField, entityId)
      .eq('type_id', documentTypeId)
      .order('version', { ascending: false })

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: (data as EmployeeDocument[] | VehicleDocument[]) ?? [] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: [], error: message }
  }
}

// ─── getDocumentTypes ────────────────────────────────────────────────────────

interface GetDocumentTypesResult {
  data: DocumentType[]
  error?: string
}

export async function getDocumentTypes(
  appliesTo: DocumentAppliesTo
): Promise<GetDocumentTypesResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('document_types')
      .select('*')
      .eq('is_active', true)
      .in('aplica_a', [appliesTo, 'both'])
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: (data as DocumentType[]) ?? [] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: [], error: message }
  }
}

// ─── createDocument ──────────────────────────────────────────────────────────

interface CreateDocumentResult {
  data: { id: string } | null
  error?: string
}

export async function createDocument(
  entityType: DocumentEntityType,
  entityId: string,
  formData: FormData
): Promise<CreateDocumentResult> {
  const typeId = formData.get('type_id')?.toString().trim() ?? ''
  if (!typeId) {
    return { data: null, error: 'El tipo de documento es requerido.' }
  }

  const sinVencimiento = formData.get('sin_vencimiento') === 'true'
  const fechaVencimiento = sinVencimiento
    ? null
    : formData.get('fecha_vencimiento')?.toString().trim() || null
  const numero = formData.get('numero')?.toString().trim() || null
  const fechaEmision = formData.get('fecha_emision')?.toString().trim() || null
  const observaciones = formData.get('observaciones')?.toString().trim() || null
  const comentarios = formData.get('comentarios')?.toString().trim() || null

  try {
    const supabase = await createClient()
    const table = getDocumentTable(entityType)
    const idField = getEntityIdField(entityType)

    // Check for existing current document of this type for this entity
    const { data: existing } = await supabase
      .from(table)
      .select('id, version')
      .eq(idField, entityId)
      .eq('type_id', typeId)
      .eq('is_current', true)
      .is('deleted_at', null)
      .maybeSingle()

    let nextVersion = 1

    if (existing) {
      nextVersion = (existing.version ?? 0) + 1

      // Archive the previous version
      const { error: archiveError } = await supabase
        .from(table)
        .update({ is_current: false, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (archiveError) {
        return { data: null, error: archiveError.message }
      }
    }

    // Insert the new document
    const insertPayload: Record<string, unknown> = {
      [idField]: entityId,
      type_id: typeId,
      numero,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      sin_vencimiento: sinVencimiento,
      observaciones,
      comentarios,
      version: nextVersion,
      is_current: true,
      estado: 'activo',
    }

    const { data: created, error: insertError } = await supabase
      .from(table)
      .insert(insertPayload)
      .select('id')
      .single<{ id: string }>()

    if (insertError) {
      return { data: null, error: insertError.message }
    }

    for (const path of getRevalidationPaths(entityType, entityId)) {
      revalidatePath(path)
    }

    return { data: { id: created.id } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: null, error: message }
  }
}

// ─── updateDocument ──────────────────────────────────────────────────────────

interface UpdateDocumentResult {
  error?: string
}

export async function updateDocument(
  documentId: string,
  entityType: DocumentEntityType,
  entityId: string,
  formData: FormData
): Promise<UpdateDocumentResult> {
  const sinVencimiento = formData.get('sin_vencimiento') === 'true'
  const fechaVencimiento = sinVencimiento
    ? null
    : formData.get('fecha_vencimiento')?.toString().trim() || null
  const numero = formData.get('numero')?.toString().trim() || null
  const fechaEmision = formData.get('fecha_emision')?.toString().trim() || null
  const observaciones = formData.get('observaciones')?.toString().trim() || null
  const comentarios = formData.get('comentarios')?.toString().trim() || null

  try {
    const supabase = await createClient()
    const table = getDocumentTable(entityType)

    const { error } = await supabase
      .from(table)
      .update({
        numero,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        sin_vencimiento: sinVencimiento,
        observaciones,
        comentarios,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (error) {
      return { error: error.message }
    }

    for (const path of getRevalidationPaths(entityType, entityId)) {
      revalidatePath(path)
    }

    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

// ─── softDeleteDocument ──────────────────────────────────────────────────────

export async function softDeleteDocument(
  documentId: string,
  entityType: DocumentEntityType,
  entityId: string,
  typeId: string
): Promise<UpdateDocumentResult> {
  try {
    const supabase = await createClient()
    const table = getDocumentTable(entityType)
    const idField = getEntityIdField(entityType)

    // Soft-delete the current document
    const { error: deleteError } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString(), is_current: false })
      .eq('id', documentId)

    if (deleteError) {
      return { error: deleteError.message }
    }

    // Restore the previous version (highest version that is not deleted and not the one we just removed)
    const { data: previous } = await supabase
      .from(table)
      .select('id')
      .eq(idField, entityId)
      .eq('type_id', typeId)
      .is('deleted_at', null)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (previous) {
      await supabase
        .from(table)
        .update({ is_current: true, updated_at: new Date().toISOString() })
        .eq('id', previous.id)
    }

    for (const path of getRevalidationPaths(entityType, entityId)) {
      revalidatePath(path)
    }

    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

// ─── uploadDocumentFile ──────────────────────────────────────────────────────

interface UploadDocumentFileResult {
  data: { id: string; storage_path: string } | null
  error?: string
}

export async function uploadDocumentFile(
  documentId: string,
  entityType: DocumentEntityType,
  file: File
): Promise<UploadDocumentFileResult> {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      data: null,
      error: 'Tipo de archivo no permitido. Solo se aceptan PDF, JPG y PNG.',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      data: null,
      error: 'El archivo supera el límite de 20 MB.',
    }
  }

  const extension = file.name.split('.').pop() ?? 'bin'
  const uniqueName = `${randomUUID()}.${extension}`
  const storagePath = `${entityType}s/${documentId}/${uniqueName}`

  try {
    const supabase = await createClient()

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      return { data: null, error: uploadError.message }
    }

    const fileTable = getFileTable(entityType)

    const { data: fileRecord, error: dbError } = await supabase
      .from(fileTable)
      .insert({
        document_id: documentId,
        storage_path: storagePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      })
      .select('id, storage_path')
      .single<{ id: string; storage_path: string }>()

    if (dbError) {
      // Clean up the uploaded file if DB insert fails
      await supabase.storage.from('documents').remove([storagePath])
      return { data: null, error: dbError.message }
    }

    return { data: { id: fileRecord.id, storage_path: fileRecord.storage_path } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: null, error: message }
  }
}

// ─── getDocumentFiles ────────────────────────────────────────────────────────

interface GetDocumentFilesResult {
  data: EmployeeDocumentFile[] | VehicleDocumentFile[]
  error?: string
}

export async function getDocumentFiles(
  documentId: string,
  entityType: DocumentEntityType
): Promise<GetDocumentFilesResult> {
  try {
    const supabase = await createClient()
    const fileTable = getFileTable(entityType)

    const { data, error } = await supabase
      .from(fileTable)
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: [], error: error.message }
    }

    return {
      data: (data as EmployeeDocumentFile[] | VehicleDocumentFile[]) ?? [],
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { data: [], error: message }
  }
}

// ─── deleteDocumentFile ──────────────────────────────────────────────────────

export async function deleteDocumentFile(
  fileId: string,
  storagePath: string,
  entityType: DocumentEntityType
): Promise<UpdateDocumentResult> {
  try {
    const supabase = await createClient()
    const fileTable = getFileTable(entityType)

    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([storagePath])

    if (storageError) {
      return { error: storageError.message }
    }

    const { error: dbError } = await supabase
      .from(fileTable)
      .delete()
      .eq('id', fileId)

    if (dbError) {
      return { error: dbError.message }
    }

    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

// ─── getFileUrl ──────────────────────────────────────────────────────────────

interface GetFileUrlResult {
  url: string | null
  error?: string
}

export async function getFileUrl(storagePath: string): Promise<GetFileUrlResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600) // 60 minutes

    if (error) {
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { url: null, error: message }
  }
}
