'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, FileText, Trash2, Pencil, Upload, Loader2, File as FileIcon, History } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import StatusBadge from '@/components/shared/StatusBadge'
import FilePreview from '@/components/shared/FilePreview'
import { getDocumentStatus, getStatusLabel } from '@/lib/utils/status'
import {
  getDocumentFiles,
  getDocumentHistory,
  softDeleteDocument,
  updateDocument,
  uploadDocumentFile,
  deleteDocumentFile,
} from '@/lib/actions/documents'
import type {
  EmployeeDocument,
  VehicleDocument,
  EmployeeDocumentFile,
  VehicleDocumentFile,
} from '@/types/database'
import type { DocumentEntityType } from '@/lib/actions/documents'

type AnyDocument = EmployeeDocument | VehicleDocument
type AnyDocumentFile = EmployeeDocumentFile | VehicleDocumentFile

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

interface EditFormValues {
  numero: string
  fecha_emision: string
  fecha_vencimiento: string
  sin_vencimiento: boolean
  observaciones: string
  comentarios: string
}

interface DocumentCardProps {
  document: AnyDocument
  entityType: DocumentEntityType
  entityId: string
  isAdmin: boolean
  onRefresh: () => void
}

export default function DocumentCard({
  document,
  entityType,
  entityId,
  isAdmin,
  onRefresh,
}: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [files, setFiles] = useState<AnyDocumentFile[]>([])
  const [filesLoaded, setFilesLoaded] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  const [showEditForm, setShowEditForm] = useState(false)
  const [editValues, setEditValues] = useState<EditFormValues>({
    numero: document.numero ?? '',
    fecha_emision: document.fecha_emision ?? '',
    fecha_vencimiento: document.fecha_vencimiento ?? '',
    sin_vencimiento: document.sin_vencimiento,
    observaciones: document.observaciones ?? '',
    comentarios: document.comentarios ?? '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)

  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<AnyDocument[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const statusColor = getDocumentStatus(document.fecha_vencimiento, document.sin_vencimiento)
  const statusLabel = getStatusLabel(statusColor)
  const typeName = document.document_type?.nombre ?? '—'

  const loadFiles = useCallback(async () => {
    if (filesLoaded) return
    setLoadingFiles(true)
    setFilesError(null)
    const { data, error } = await getDocumentFiles(document.id, entityType)
    setLoadingFiles(false)
    setFilesLoaded(true)
    if (error) {
      setFilesError(error)
    } else {
      setFiles(data as AnyDocumentFile[])
    }
  }, [document.id, entityType, filesLoaded])

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return
    setLoadingHistory(true)
    setHistoryError(null)
    const { data, error } = await getDocumentHistory(
      document.type_id,
      entityId,
      entityType
    )
    setLoadingHistory(false)
    setHistoryLoaded(true)
    if (error) {
      setHistoryError(error)
    } else {
      // Exclude the current version — the card itself already represents it
      const previousVersions = (data as AnyDocument[]).filter(
        (d) => d.id !== document.id
      )
      setHistory(previousVersions)
    }
  }, [document.id, document.type_id, entityId, entityType, historyLoaded])

  function handleToggleHistory() {
    const next = !showHistory
    setShowHistory(next)
    if (next && !historyLoaded) {
      loadHistory()
    }
  }

  function handleToggle() {
    const next = !expanded
    setExpanded(next)
    if (next && !filesLoaded) {
      loadFiles()
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el documento "${typeName}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await softDeleteDocument(document.id, entityType, entityId, document.type_id)
    setDeleting(false)
    if (error) {
      setDeleteError(error)
    } else {
      onRefresh()
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSavingEdit(true)
    setEditError(null)
    const fd = new FormData()
    fd.set('numero', editValues.numero)
    fd.set('fecha_emision', editValues.fecha_emision)
    fd.set('fecha_vencimiento', editValues.fecha_vencimiento)
    fd.set('sin_vencimiento', String(editValues.sin_vencimiento))
    fd.set('observaciones', editValues.observaciones)
    fd.set('comentarios', editValues.comentarios)
    const { error } = await updateDocument(document.id, entityType, entityId, fd)
    setSavingEdit(false)
    if (error) {
      setEditError(error)
    } else {
      setShowEditForm(false)
      onRefresh()
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    setUploading(true)
    setUploadError(null)

    for (const file of Array.from(selectedFiles)) {
      const { error } = await uploadDocumentFile(document.id, entityType, file)
      if (error) {
        setUploadError(error)
        setUploading(false)
        return
      }
    }

    setUploading(false)
    setFilesLoaded(false)
    await loadFiles()
    setFilesLoaded(true)
    e.target.value = ''
  }

  async function handleDeleteFile(fileId: string, storagePath: string) {
    if (!confirm('¿Eliminar este archivo?')) return
    setDeletingFileId(fileId)
    const { error } = await deleteDocumentFile(fileId, storagePath, entityType)
    setDeletingFileId(null)
    if (error) {
      setFilesError(error)
    } else {
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Card header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={16} className="text-gray-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{typeName}</p>
            {document.numero && (
              <p className="text-xs text-gray-500 truncate">N° {document.numero}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <StatusBadge color={statusColor} label={statusLabel} />
            <p className="mt-0.5 text-xs text-gray-400">
              {document.sin_vencimiento ? 'Sin vencimiento' : formatDate(document.fecha_vencimiento)}
            </p>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Mobile status row */}
      <div className="sm:hidden px-4 pb-2 flex items-center justify-between">
        <StatusBadge color={statusColor} label={statusLabel} />
        <p className="text-xs text-gray-400">
          {document.sin_vencimiento ? 'Sin vencimiento' : formatDate(document.fecha_vencimiento)}
        </p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-4">
          {/* Metadata row */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 text-xs">
            <div>
              <dt className="text-gray-400 uppercase tracking-wide font-medium">Versión</dt>
              <dd className="text-gray-700 mt-0.5">v{document.version}</dd>
            </div>
            <div>
              <dt className="text-gray-400 uppercase tracking-wide font-medium">Emisión</dt>
              <dd className="text-gray-700 mt-0.5">{formatDate(document.fecha_emision)}</dd>
            </div>
            {document.observaciones && (
              <div className="col-span-2">
                <dt className="text-gray-400 uppercase tracking-wide font-medium">Observaciones</dt>
                <dd className="text-gray-700 mt-0.5">{document.observaciones}</dd>
              </div>
            )}
            {document.comentarios && (
              <div className="col-span-2">
                <dt className="text-gray-400 uppercase tracking-wide font-medium">Comentarios</dt>
                <dd className="text-gray-700 mt-0.5">{document.comentarios}</dd>
              </div>
            )}
          </dl>

          {/* Files section */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Archivos</p>
            {loadingFiles ? (
              <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                Cargando archivos…
              </div>
            ) : filesError ? (
              <p className="text-xs text-red-500 py-2">{filesError}</p>
            ) : files.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Sin archivos adjuntos.</p>
            ) : (
              <ul className="space-y-1">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700 truncate max-w-[180px]">
                        {file.file_name}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        ({Math.round(file.file_size / 1024)} KB)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <FilePreview
                        storagePath={file.storage_path}
                        fileName={file.file_name}
                        fileType={file.file_type}
                      />
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.storage_path)}
                          disabled={deletingFileId === file.id}
                          title="Eliminar archivo"
                          className="inline-flex items-center rounded px-1.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {deletingFileId === file.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Version history toggle (all roles) */}
          <div className="pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={handleToggleHistory}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <History size={12} />
              {showHistory ? 'Ocultar historial' : 'Ver historial de versiones'}
            </button>

            {showHistory && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                {loadingHistory ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                    <Loader2 size={12} className="animate-spin" />
                    Cargando historial…
                  </div>
                ) : historyError ? (
                  <p className="text-xs text-red-500">{historyError}</p>
                ) : history.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No hay versiones anteriores de este documento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Versiones anteriores ({history.length})
                    </p>
                    <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
                      {history.map((prev) => {
                        const archived = !prev.is_current
                        const deleted = !!prev.deleted_at
                        let statusLabel = 'Vigente'
                        let statusClass = 'bg-green-100 text-green-800'
                        if (deleted) {
                          statusLabel = 'Eliminada'
                          statusClass = 'bg-red-100 text-red-800'
                        } else if (archived) {
                          statusLabel = 'Archivada'
                          statusClass = 'bg-gray-100 text-gray-700'
                        }
                        return (
                          <li
                            key={prev.id}
                            className="grid grid-cols-1 gap-2 px-3 py-2 sm:grid-cols-5 sm:items-center"
                          >
                            <span className="text-xs font-semibold text-gray-700">
                              v{prev.version}
                            </span>
                            <span className="text-xs text-gray-600 sm:col-span-1">
                              <span className="text-gray-400">Emisión: </span>
                              {formatDate(prev.fecha_emision)}
                            </span>
                            <span className="text-xs text-gray-600 sm:col-span-2">
                              <span className="text-gray-400">Venc.: </span>
                              {prev.sin_vencimiento
                                ? 'Sin vencimiento'
                                : formatDate(prev.fecha_vencimiento)}
                            </span>
                            <span
                              className={`justify-self-start sm:justify-self-end inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass}`}
                            >
                              {statusLabel}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowEditForm((prev) => !prev)
                  setEditError(null)
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Pencil size={12} />
                Editar
              </button>

              {/* Upload file */}
              <label className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                {uploading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Upload size={12} />
                )}
                {uploading ? 'Subiendo…' : 'Subir archivo'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="sr-only"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>

              {uploadError && (
                <p className="w-full text-xs text-red-500">{uploadError}</p>
              )}
              {deleteError && (
                <p className="w-full text-xs text-red-500">{deleteError}</p>
              )}
            </div>
          )}

          {/* Edit form */}
          {isAdmin && showEditForm && (
            <form
              onSubmit={handleSaveEdit}
              className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
            >
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Editar metadatos
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={editValues.numero}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, numero: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Número del documento"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fecha de emisión
                  </label>
                  <input
                    type="date"
                    value={editValues.fecha_emision}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, fecha_emision: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fecha de vencimiento
                  </label>
                  <input
                    type="date"
                    value={editValues.fecha_vencimiento}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        fecha_vencimiento: e.target.value,
                      }))
                    }
                    disabled={editValues.sin_vencimiento}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id={`sin-vencimiento-edit-${document.id}`}
                    checked={editValues.sin_vencimiento}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        sin_vencimiento: e.target.checked,
                        fecha_vencimiento: e.target.checked ? '' : prev.fecha_vencimiento,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                  />
                  <label
                    htmlFor={`sin-vencimiento-edit-${document.id}`}
                    className="text-xs text-gray-600"
                  >
                    Sin vencimiento
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={editValues.observaciones}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, observaciones: e.target.value }))
                    }
                    rows={2}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Comentarios
                  </label>
                  <textarea
                    value={editValues.comentarios}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, comentarios: e.target.value }))
                    }
                    rows={2}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                  />
                </div>
              </div>

              {editError && (
                <p className="text-xs text-red-500">{editError}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="rounded-md border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
