'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Loader2,
  Plus,
  Pencil,
  X,
  Check,
  Power,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Users,
  Truck,
  LayoutGrid,
} from 'lucide-react'
import {
  createDocumentType,
  updateDocumentType,
  toggleDocumentTypeActive,
  reorderDocumentTypes,
} from '@/lib/actions/document-types'
import type { DocumentType, DocumentAppliesTo } from '@/types/database'

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

interface DocumentTypesManagerProps {
  initialTypes: DocumentType[]
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
  const copy = arr.slice()
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

function groupTypes(types: DocumentType[]) {
  return {
    employee: types.filter((t) => t.aplica_a === 'employee'),
    vehicle: types.filter((t) => t.aplica_a === 'vehicle'),
    both: types.filter((t) => t.aplica_a === 'both'),
  }
}

// ─── Inline edit/create row form ─────────────────────────────────────────────

interface TypeFormProps {
  values: FormValues
  onChange: (v: FormValues) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isPending: boolean
  error: string | null
  lockAplicaA?: boolean
}

function TypeForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  error,
  lockAplicaA,
}: TypeFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 py-1">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <input
            type="text"
            value={values.nombre}
            onChange={(e) => onChange({ ...values, nombre: e.target.value })}
            required
            placeholder="Ej. Certificado MOPF"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
        <div>
          <select
            value={values.aplica_a}
            onChange={(e) => onChange({ ...values, aplica_a: e.target.value as DocumentAppliesTo })}
            disabled={lockAplicaA}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
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
          checked={values.requiere_vencimiento}
          onChange={(e) => onChange({ ...values, requiere_vencimiento: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
        />
        Requiere fecha de vencimiento
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Section component ────────────────────────────────────────────────────────

interface SectionConfig {
  aplica_a: DocumentAppliesTo
  label: string
  description: string
  icon: React.ReactNode
  accentClass: string
  borderClass: string
}

const SECTIONS: SectionConfig[] = [
  {
    aplica_a: 'employee',
    label: 'Documentación de Personal',
    description: 'Documentos que aplican únicamente a empleados',
    icon: <Users size={16} />,
    accentClass: 'text-blue-700 bg-blue-50',
    borderClass: 'border-blue-200',
  },
  {
    aplica_a: 'vehicle',
    label: 'Documentación de Vehículos',
    description: 'Documentos que aplican únicamente a vehículos',
    icon: <Truck size={16} />,
    accentClass: 'text-orange-700 bg-orange-50',
    borderClass: 'border-orange-200',
  },
  {
    aplica_a: 'both',
    label: 'Ambos — Personal y Vehículos',
    description: 'Documentos que aplican a empleados y vehículos por igual',
    icon: <LayoutGrid size={16} />,
    accentClass: 'text-purple-700 bg-purple-50',
    borderClass: 'border-purple-200',
  },
]

interface TypeSectionProps {
  config: SectionConfig
  items: DocumentType[]
  editingId: string | null
  editForm: FormValues
  editError: string | null
  isPending: boolean
  isSavingOrder: boolean
  dragId: string | null
  dragOverId: string | null
  showCreateHere: boolean
  createForm: FormValues
  createError: string | null
  onStartEdit: (t: DocumentType) => void
  onCancelEdit: () => void
  onEditFormChange: (v: FormValues) => void
  onUpdate: (e: React.FormEvent, id: string) => void
  onToggle: (id: string, active: boolean) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOver: (id: string) => void
  onDragLeave: (id: string) => void
  onDrop: (targetId: string) => void
  onShowCreate: () => void
  onHideCreate: () => void
  onCreateFormChange: (v: FormValues) => void
  onCreate: (e: React.FormEvent) => void
}

function TypeSection({
  config,
  items,
  editingId,
  editForm,
  editError,
  isPending,
  isSavingOrder,
  dragId,
  dragOverId,
  showCreateHere,
  createForm,
  createError,
  onStartEdit,
  onCancelEdit,
  onEditFormChange,
  onUpdate,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onShowCreate,
  onHideCreate,
  onCreateFormChange,
  onCreate,
}: TypeSectionProps) {
  return (
    <div className={`rounded-xl border ${config.borderClass} bg-white shadow-sm overflow-hidden`}>
      {/* Section header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${config.borderClass}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center rounded-md p-1.5 ${config.accentClass}`}>
            {config.icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{config.label}</p>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {items.length} tipo{items.length === 1 ? '' : 's'}
          </span>
          {!showCreateHere && (
            <button
              type="button"
              onClick={onShowCreate}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Plus size={12} />
              Nuevo
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showCreateHere && (
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Nuevo tipo — {config.label}</p>
            <button
              type="button"
              onClick={onHideCreate}
              className="text-gray-400 hover:text-gray-700"
              aria-label="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
          <TypeForm
            values={createForm}
            onChange={onCreateFormChange}
            onSubmit={onCreate}
            onCancel={onHideCreate}
            isPending={isPending}
            error={createError}
            lockAplicaA
          />
        </div>
      )}

      {/* Table */}
      {items.length === 0 && !showCreateHere ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-xs text-gray-400">
            No hay tipos configurados para esta sección.
          </p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="w-10 px-2 py-2.5" aria-label="Reordenar" />
              <th className="w-10 px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                #
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                Nombre
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                Vencimiento
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                Estado
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((type, index) => {
              const isEditing = editingId === type.id
              const isDragging = dragId === type.id
              const isDragOver = dragOverId === type.id && dragId !== type.id

              return (
                <tr
                  key={type.id}
                  onDragOver={(e) => {
                    if (!dragId) return
                    e.preventDefault()
                    onDragOver(type.id)
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                    onDragLeave(type.id)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    onDrop(type.id)
                  }}
                  className={[
                    'border-b border-gray-100 align-top transition-colors',
                    isDragging ? 'opacity-40' : 'hover:bg-gray-50',
                    isDragOver ? 'bg-orange-50 outline outline-2 outline-orange-300' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isEditing ? (
                    <td colSpan={6} className="px-4 py-3">
                      <TypeForm
                        values={editForm}
                        onChange={onEditFormChange}
                        onSubmit={(e) => onUpdate(e, type.id)}
                        onCancel={onCancelEdit}
                        isPending={isPending}
                        error={editError}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            onDragStart(type.id)
                            e.dataTransfer.effectAllowed = 'move'
                            try { e.dataTransfer.setData('text/plain', type.id) } catch { /* ok */ }
                          }}
                          onDragEnd={onDragEnd}
                          aria-label={`Reordenar ${type.nombre}`}
                          title="Arrastrá para reordenar"
                          className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing"
                        >
                          <GripVertical size={14} />
                        </button>
                      </td>
                      <td className="px-2 py-3 text-center text-xs font-medium text-gray-400">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {type.nombre}
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
                            onClick={() => onMoveUp(index)}
                            disabled={index === 0 || isSavingOrder}
                            aria-label="Subir"
                            title="Subir"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveDown(index)}
                            disabled={index >= items.length - 1 || isSavingOrder}
                            aria-label="Bajar"
                            title="Bajar"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onStartEdit(type)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil size={12} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggle(type.id, type.is_active)}
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
  )
}

// ─── Main manager ─────────────────────────────────────────────────────────────

export default function DocumentTypesManager({
  initialTypes,
}: DocumentTypesManagerProps) {
  const [isPending, startTransition] = useTransition()

  const [employeeTypes, setEmployeeTypes] = useState<DocumentType[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<DocumentType[]>([])
  const [bothTypes, setBothTypes] = useState<DocumentType[]>([])

  useEffect(() => {
    const g = groupTypes(initialTypes)
    setEmployeeTypes(g.employee)
    setVehicleTypes(g.vehicle)
    setBothTypes(g.both)
  }, [initialTypes])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormValues>({ nombre: '', aplica_a: 'employee', requiere_vencimiento: true })
  const [editError, setEditError] = useState<string | null>(null)

  const [showCreateSection, setShowCreateSection] = useState<DocumentAppliesTo | null>(null)
  const [createForm, setCreateForm] = useState<FormValues>({ nombre: '', aplica_a: 'employee', requiere_vencimiento: true })
  const [createError, setCreateError] = useState<string | null>(null)

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragSection, setDragSection] = useState<DocumentAppliesTo | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  function startEdit(type: DocumentType) {
    setEditingId(type.id)
    setEditForm({ nombre: type.nombre, aplica_a: type.aplica_a, requiere_vencimiento: type.requiere_vencimiento })
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

  function handleShowCreate(section: DocumentAppliesTo) {
    setShowCreateSection(section)
    setCreateForm({ nombre: '', aplica_a: section, requiere_vencimiento: true })
    setCreateError(null)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    startTransition(async () => {
      const { error } = await createDocumentType(buildFormData(createForm))
      if (error) {
        setCreateError(error)
      } else {
        setCreateForm({ nombre: '', aplica_a: showCreateSection ?? 'employee', requiere_vencimiento: true })
        setShowCreateSection(null)
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
    if (!confirm(`¿${verb.charAt(0).toUpperCase() + verb.slice(1)} este tipo de documento?`)) return
    startTransition(async () => {
      await toggleDocumentTypeActive(id, !currentActive)
    })
  }

  async function persistOrder(emp: DocumentType[], veh: DocumentType[], both: DocumentType[]) {
    setReorderError(null)
    setIsSavingOrder(true)
    const allIds = [...emp, ...veh, ...both].map((t) => t.id)
    const { error } = await reorderDocumentTypes(allIds)
    setIsSavingOrder(false)
    if (error) {
      setReorderError(error)
      const g = groupTypes(initialTypes)
      setEmployeeTypes(g.employee)
      setVehicleTypes(g.vehicle)
      setBothTypes(g.both)
    }
  }

  function reorderSection(
    section: DocumentAppliesTo,
    fromIndex: number,
    toIndex: number,
  ) {
    if (section === 'employee') {
      const next = moveItem(employeeTypes, fromIndex, toIndex)
      if (next === employeeTypes) return
      setEmployeeTypes(next)
      void persistOrder(next, vehicleTypes, bothTypes)
    } else if (section === 'vehicle') {
      const next = moveItem(vehicleTypes, fromIndex, toIndex)
      if (next === vehicleTypes) return
      setVehicleTypes(next)
      void persistOrder(employeeTypes, next, bothTypes)
    } else {
      const next = moveItem(bothTypes, fromIndex, toIndex)
      if (next === bothTypes) return
      setBothTypes(next)
      void persistOrder(employeeTypes, vehicleTypes, next)
    }
  }

  function getSection(section: DocumentAppliesTo) {
    return section === 'employee' ? employeeTypes : section === 'vehicle' ? vehicleTypes : bothTypes
  }

  function handleDrop(targetId: string) {
    if (!dragId || !dragSection || dragId === targetId) {
      setDragId(null)
      setDragOverId(null)
      setDragSection(null)
      return
    }
    const items = getSection(dragSection)
    const fromIndex = items.findIndex((t) => t.id === dragId)
    const toIndex = items.findIndex((t) => t.id === targetId)
    setDragId(null)
    setDragOverId(null)
    setDragSection(null)
    if (fromIndex === -1 || toIndex === -1) return
    reorderSection(dragSection, fromIndex, toIndex)
  }

  const total = employeeTypes.length + vehicleTypes.length + bothTypes.length

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>
          {total} tipo{total === 1 ? '' : 's'} configurado{total === 1 ? '' : 's'}
        </span>
        <span className="hidden text-xs text-gray-400 sm:inline">
          · Arrastrá <GripVertical size={12} className="inline -mt-0.5" /> para reordenar dentro de cada sección
        </span>
        {isSavingOrder && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Loader2 size={12} className="animate-spin" />
            Guardando orden…
          </span>
        )}
      </div>

      {reorderError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          No se pudo guardar el nuevo orden: {reorderError}
        </div>
      )}

      {/* Three sections */}
      {SECTIONS.map((config) => {
        const items = getSection(config.aplica_a)
        return (
          <TypeSection
            key={config.aplica_a}
            config={config}
            items={items}
            editingId={editingId}
            editForm={editForm}
            editError={editError}
            isPending={isPending}
            isSavingOrder={isSavingOrder}
            dragId={dragSection === config.aplica_a ? dragId : null}
            dragOverId={dragSection === config.aplica_a ? dragOverId : null}
            showCreateHere={showCreateSection === config.aplica_a}
            createForm={createForm}
            createError={createError}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onEditFormChange={setEditForm}
            onUpdate={handleUpdate}
            onToggle={handleToggle}
            onMoveUp={(index) => reorderSection(config.aplica_a, index, index - 1)}
            onMoveDown={(index) => reorderSection(config.aplica_a, index, index + 1)}
            onDragStart={(id) => {
              setDragId(id)
              setDragSection(config.aplica_a)
            }}
            onDragEnd={() => {
              setDragId(null)
              setDragOverId(null)
              setDragSection(null)
            }}
            onDragOver={(id) => {
              if (dragSection === config.aplica_a && dragOverId !== id) setDragOverId(id)
            }}
            onDragLeave={(id) => {
              if (dragOverId === id) setDragOverId(null)
            }}
            onDrop={handleDrop}
            onShowCreate={() => handleShowCreate(config.aplica_a)}
            onHideCreate={() => setShowCreateSection(null)}
            onCreateFormChange={setCreateForm}
            onCreate={handleCreate}
          />
        )
      })}
    </div>
  )
}
