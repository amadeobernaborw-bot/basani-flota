'use client'

import { useState, useTransition } from 'react'
import { Loader2, Plus, Pencil, X, Check, Power } from 'lucide-react'
import {
  createDocumentType,
  updateDocumentType,
  toggleDocumentTypeActive,
} from '@/lib/actions/document-types'
import type { DocumentType, DocumentAppliesTo } from '@/types/database'

const APLICA_A_LABELS: Record<DocumentAppliesTo, string> = {
  employee: 'Empleados',
  vehicle: 'Vehículos',
  both: 'Ambos',
}

const APLICA_A_OPTIONS: { value: DocumentAppliesTo; label: string }[] = [
  { value: 'employee', label: 'Empleados' },
  { value: 'vehicle', label: 'Vehículos' },
  { value: 'both', label: 'Ambos' },
]

interface FormValues {
  nombre: string
  aplica_a: DocumentAppliesTo
  requiere_vencimiento: boolean
}

const INITIAL_FORM: FormValues = {
  nombre: '',
  aplica_a: 'employee',
  requiere_vencimiento: true,
}

interface DocumentTypesManagerProps {
  initialTypes: DocumentType[]
}

export default function DocumentTypesManager({
  initialTypes,
}: DocumentTypesManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<FormValues>(INITIAL_FORM)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormValues>(INITIAL_FORM)
  const [editError, setEditError] = useState<string | null>(null)

  function startEdit(type: DocumentType) {
    setEditingId(type.id)
    setEditForm({
      nombre: type.nombre,
      aplica_a: type.aplica_a,
      requiere_vencimiento: type.requiere_vencimiento,
    })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  function buildFormData(values: FormValues): FormData {
    const fd = new FormData()
    fd.set('nombre', values.nombre)
    fd.set('aplica_a', values.aplica_a)
    fd.set('requiere_vencimiento', String(values.requiere_vencimiento))
    return fd
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    startTransition(async () => {
      const { error } = await createDocumentType(buildFormData(createForm))
      if (error) {
        setCreateError(error)
      } else {
        setCreateForm(INITIAL_FORM)
        setShowCreate(false)
      }
    })
  }

  function handleUpdate(e: React.FormEvent, id: string) {
    e.preventDefault()
    setEditError(null)
    startTransition(async () => {
      const { error } = await updateDocumentType(id, buildFormData(editForm))
      if (error) {
        setEditError(error)
      } else {
        setEditingId(null)
      }
    })
  }

  function handleToggle(id: string, currentActive: boolean) {
    const verb = currentActive ? 'desactivar' : 'activar'
    if (!confirm(`¿${verb.charAt(0).toUpperCase() + verb.slice(1)} este tipo de documento?`)) {
      return
    }
    startTransition(async () => {
      await toggleDocumentTypeActive(id, !currentActive)
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {initialTypes.length} tipo{initialTypes.length === 1 ? '' : 's'} configurado{initialTypes.length === 1 ? '' : 's'}
        </p>
        {!showCreate && (
          <button
            type="button"
            onClick={() => {
              setCreateForm(INITIAL_FORM)
              setShowCreate(true)
              setCreateError(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            <Plus size={14} />
            Nuevo tipo
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Nuevo tipo de documento</p>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-gray-400 hover:text-gray-700"
              aria-label="Cancelar"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.nombre}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, nombre: e.target.value }))
                }
                required
                placeholder="Ej. Certificado MOPF"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Aplica a
              </label>
              <select
                value={createForm.aplica_a}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    aplica_a: e.target.value as DocumentAppliesTo,
                  }))
                }
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {APLICA_A_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={createForm.requiere_vencimiento}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  requiere_vencimiento: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
            />
            Requiere fecha de vencimiento
          </label>

          {createError && <p className="text-xs text-red-500">{createError}</p>}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Types table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {initialTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-gray-500">
              No hay tipos de documentos configurados
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Creá el primero con el botón “Nuevo tipo”.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Aplica a
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Vencimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {initialTypes.map((type) => {
                const isEditing = editingId === type.id
                return (
                  <tr
                    key={type.id}
                    className="border-b border-gray-100 hover:bg-gray-50 align-top"
                  >
                    {isEditing ? (
                      <td colSpan={5} className="px-4 py-3">
                        <form
                          onSubmit={(e) => handleUpdate(e, type.id)}
                          className="space-y-3"
                        >
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input
                              type="text"
                              value={editForm.nombre}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  nombre: e.target.value,
                                }))
                              }
                              required
                              className="sm:col-span-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                            <select
                              value={editForm.aplica_a}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  aplica_a: e.target.value as DocumentAppliesTo,
                                }))
                              }
                              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                              {APLICA_A_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={editForm.requiere_vencimiento}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  requiere_vencimiento: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                            />
                            Requiere fecha de vencimiento
                          </label>

                          {editError && (
                            <p className="text-xs text-red-500">{editError}</p>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                            >
                              {isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {type.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {APLICA_A_LABELS[type.aplica_a]}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {type.requiere_vencimiento ? 'Sí' : 'No'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              type.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {type.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(type)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil size={12} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggle(type.id, type.is_active)}
                              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                                type.is_active
                                  ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                                  : 'border-green-200 text-green-700 hover:bg-green-50'
                              }`}
                            >
                              <Power size={12} />
                              {type.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
