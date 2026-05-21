'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, FileText, Loader2, X } from 'lucide-react'
import {
  getDocuments,
  getDocumentTypes,
  createDocument,
  uploadDocumentFile,
} from '@/lib/actions/documents'
import DocumentCard from '@/components/shared/DocumentCard'
import type { VehicleDocument, DocumentType } from '@/types/database'

interface VehicleDocumentsTabProps {
  vehicleId: string
  isAdmin: boolean
}

interface AddFormState {
  type_id: string
  numero: string
  fecha_emision: string
  fecha_vencimiento: string
  sin_vencimiento: boolean
  observaciones: string
  comentarios: string
}

const INITIAL_FORM: AddFormState = {
  type_id: '',
  numero: '',
  fecha_emision: '',
  fecha_vencimiento: '',
  sin_vencimiento: false,
  observaciones: '',
  comentarios: '',
}

export default function VehicleDocumentsTab({
  vehicleId,
  isAdmin,
}: VehicleDocumentsTabProps) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddFormState>(INITIAL_FORM)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await getDocuments('vehicle', vehicleId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError)
    } else {
      setDocuments(data as VehicleDocument[])
    }
  }, [vehicleId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  async function openAddForm() {
    setForm(INITIAL_FORM)
    setPendingFiles([])
    setFormError(null)
    if (documentTypes.length === 0) {
      const { data } = await getDocumentTypes('vehicle')
      setDocumentTypes(data)
    }
    setShowAddForm(true)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files
    if (!selected) return
    setPendingFiles((prev) => [...prev, ...Array.from(selected)])
    e.target.value = ''
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.type_id) {
      setFormError('Seleccioná un tipo de documento.')
      return
    }
    if (!form.sin_vencimiento && !form.fecha_vencimiento) {
      setFormError('Ingresá la fecha de vencimiento o marcá "Sin vencimiento".')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const fd = new FormData()
    fd.set('type_id', form.type_id)
    fd.set('numero', form.numero)
    fd.set('fecha_emision', form.fecha_emision)
    fd.set('fecha_vencimiento', form.fecha_vencimiento)
    fd.set('sin_vencimiento', String(form.sin_vencimiento))
    fd.set('observaciones', form.observaciones)
    fd.set('comentarios', form.comentarios)

    const { data: created, error: createError } = await createDocument('vehicle', vehicleId, fd)

    if (createError || !created) {
      setFormError(createError ?? 'Error al crear el documento.')
      setSubmitting(false)
      return
    }

    // Upload pending files
    for (const file of pendingFiles) {
      const { error: uploadError } = await uploadDocumentFile(created.id, 'vehicle', file)
      if (uploadError) {
        setFormError(`Documento creado, pero error al subir "${file.name}": ${uploadError}`)
        setSubmitting(false)
        await loadDocuments()
        return
      }
    }

    setSubmitting(false)
    setShowAddForm(false)
    setForm(INITIAL_FORM)
    setPendingFiles([])
    await loadDocuments()
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Documentos
        </h2>
        {isAdmin && (
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Agregar documento
          </button>
        )}
      </div>

      {/* Add document form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Nuevo documento</p>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de documento <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type_id}
                onChange={(e) => setForm((prev) => ({ ...prev, type_id: e.target.value }))}
                required
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">Seleccionar tipo…</option>
                {documentTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
              <input
                type="text"
                value={form.numero}
                onChange={(e) => setForm((prev) => ({ ...prev, numero: e.target.value }))}
                placeholder="Número del documento"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de emisión</label>
              <input
                type="date"
                value={form.fecha_emision}
                onChange={(e) => setForm((prev) => ({ ...prev, fecha_emision: e.target.value }))}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha de vencimiento {!form.sin_vencimiento && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fecha_vencimiento: e.target.value }))
                }
                disabled={form.sin_vencimiento}
                required={!form.sin_vencimiento}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="sin-vencimiento-vehicle-new"
                checked={form.sin_vencimiento}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sin_vencimiento: e.target.checked,
                    fecha_vencimiento: e.target.checked ? '' : prev.fecha_vencimiento,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
              />
              <label htmlFor="sin-vencimiento-vehicle-new" className="text-xs text-gray-600">
                Sin vencimiento
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Comentarios</label>
              <textarea
                value={form.comentarios}
                onChange={(e) => setForm((prev) => ({ ...prev, comentarios: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
              />
            </div>

            {/* File upload */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Archivos adjuntos (PDF, JPG, PNG — máx. 20 MB por archivo)
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-gray-300 bg-white px-4 py-3 text-xs text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-colors w-full justify-center">
                <Plus size={14} />
                Seleccionar archivos
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </label>
              {pendingFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {pendingFiles.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-white border border-gray-100 px-3 py-1.5 text-xs"
                    >
                      <span className="text-gray-700 truncate max-w-[200px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-500">{formError}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar documento'
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          Cargando documentos…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 mb-4">
            <FileText size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">Sin documentos cargados</p>
          <p className="mt-1 text-xs text-gray-400">
            Los documentos del vehículo se cargarán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              entityType="vehicle"
              entityId={vehicleId}
              isAdmin={isAdmin}
              onRefresh={loadDocuments}
            />
          ))}
        </div>
      )}
    </div>
  )
}
