'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DocumentType, DocumentAppliesTo } from '@/types/database'

interface GetAllResult {
  data: DocumentType[]
  error?: string
}

interface ActionResult {
  error?: string
}

const VALID_APLICA_A: DocumentAppliesTo[] = ['employee', 'vehicle', 'both']

export async function getAllDocumentTypes(): Promise<GetAllResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('document_types')
      .select('*')
      .order('aplica_a', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }
    return { data: (data as DocumentType[]) ?? [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { data: [], error: message }
  }
}

export async function createDocumentType(
  formData: FormData
): Promise<ActionResult> {
  const nombre = formData.get('nombre')?.toString().trim() ?? ''
  const aplica_a = formData.get('aplica_a')?.toString().trim() ?? ''
  const requiere_vencimiento = formData.get('requiere_vencimiento') === 'true'

  if (!nombre) return { error: 'El nombre es requerido.' }
  if (!VALID_APLICA_A.includes(aplica_a as DocumentAppliesTo)) {
    return { error: 'El campo "Aplica a" es inválido.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('document_types').insert({
      nombre,
      aplica_a: aplica_a as DocumentAppliesTo,
      requiere_vencimiento,
      is_active: true,
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/settings')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function updateDocumentType(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const nombre = formData.get('nombre')?.toString().trim() ?? ''
  const aplica_a = formData.get('aplica_a')?.toString().trim() ?? ''
  const requiere_vencimiento = formData.get('requiere_vencimiento') === 'true'

  if (!nombre) return { error: 'El nombre es requerido.' }
  if (!VALID_APLICA_A.includes(aplica_a as DocumentAppliesTo)) {
    return { error: 'El campo "Aplica a" es inválido.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('document_types')
      .update({
        nombre,
        aplica_a: aplica_a as DocumentAppliesTo,
        requiere_vencimiento,
      })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/settings')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}

export async function toggleDocumentTypeActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('document_types')
      .update({ is_active: active })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/settings')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}
