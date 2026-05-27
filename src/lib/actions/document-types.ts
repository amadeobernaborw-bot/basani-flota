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
      .order('orden', { ascending: true })
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

    // New rows go to the end of the global order. Step 10 leaves room
    // between siblings so a single drag doesn't have to renumber everything.
    const { data: last } = await supabase
      .from('document_types')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle<{ orden: number }>()

    const nextOrden = (last?.orden ?? 0) + 10

    const { error } = await supabase.from('document_types').insert({
      nombre,
      aplica_a: aplica_a as DocumentAppliesTo,
      requiere_vencimiento,
      is_active: true,
      orden: nextOrden,
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

// ─── reorderDocumentTypes ────────────────────────────────────────────────────
// Accepts the full list of document type IDs in the desired order and
// rewrites every `orden` value to (index + 1) * 10. This keeps the
// numbering dense and predictable. Single round-trip via RPC would be
// nicer, but a sequential update per row is fine at this scale (<200 rows).

export async function reorderDocumentTypes(
  orderedIds: string[]
): Promise<ActionResult> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { error: 'Lista de orden vacía.' }
  }

  try {
    const supabase = await createClient()

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('document_types')
        .update({ orden: (i + 1) * 10 })
        .eq('id', orderedIds[i])

      if (error) {
        return { error: error.message }
      }
    }

    revalidatePath('/settings')
    revalidatePath('/employees', 'layout')
    revalidatePath('/vehicles', 'layout')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return { error: message }
  }
}
