'use client'

import { useState, useTransition } from 'react'
import { Loader2, Plus, X, Power, Trash2 } from 'lucide-react'
import {
  createMaintenanceRule,
  toggleMaintenanceRuleActive,
  deleteMaintenanceRule,
} from '@/lib/actions/maintenance'
import type { MaintenanceRule, VehicleCategory } from '@/types/database'

const CATEGORIA_LABELS: Record<VehicleCategory, string> = {
  auto: 'Autos',
  camioneta: 'Camionetas',
  camion: 'Camiones',
}

interface VehicleOption {
  id: string
  patente: string
  marca: string
  modelo: string
}

interface CreateForm {
  scope: 'global' | 'individual'
  categoria: VehicleCategory
  vehicle_id: string
  tipo_mantenimiento: string
  descripcion: string
  km_intervalo: string
  dias_intervalo: string
}

const INITIAL_FORM: CreateForm = {
  scope: 'global',
  categoria: 'auto',
  vehicle_id: '',
  tipo_mantenimiento: '',
  descripcion: '',
  km_intervalo: '',
  dias_intervalo: '',
}

interface MaintenanceRulesManagerProps {
  initialRules: MaintenanceRule[]
  vehicles: VehicleOption[]
}

export default function MaintenanceRulesManager({
  initialRules,
  vehicles,
}: MaintenanceRulesManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(INITIAL_FORM)
  const [createError, setCreateError] = useState<string | null>(null)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    const fd = new FormData()
    fd.set('scope', form.scope)
    if (form.scope === 'global') {
      fd.set('categoria', form.categoria)
    } else {
      fd.set('vehicle_id', form.vehicle_id)
    }
    fd.set('tipo_mantenimiento', form.tipo_mantenimiento)
    fd.set('descripcion', form.descripcion)
    fd.set('km_intervalo', form.km_intervalo)
    fd.set('dias_intervalo', form.dias_intervalo)

    startTransition(async () => {
      const { error } = await createMaintenanceRule(fd)
      if (error) {
        setCreateError(error)
      } else {
        setForm(INITIAL_FORM)
        setShowCreate(false)
      }
    })
  }

  function handleToggle(id: string, currentActive: boolean) {
    const verb = currentActive ? 'desactivar' : 'activar'
    if (!confirm(`¿${verb.charAt(0).toUpperCase() + verb.slice(1)} esta regla?`)) {
      return
    }
    startTransition(async () => {
      await toggleMaintenanceRuleActive(id, !currentActive)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar definitivamente esta regla? Esta acción no se puede deshacer.')) {
      return
    }
    startTransition(async () => {
      await deleteMaintenanceRule(id)
    })
  }

  function renderInterval(rule: MaintenanceRule): string {
    const parts: string[] = []
    if (rule.km_intervalo) parts.push(`${rule.km_intervalo.toLocaleString('es-AR')} km`)
    if (rule.dias_intervalo) parts.push(`${rule.dias_intervalo} días`)
    return parts.join(' / ') || '—'
  }

  function renderScope(rule: MaintenanceRule): string {
    if (rule.is_global) {
      return `Global · ${rule.categoria ? CATEGORIA_LABELS[rule.categoria] : '—'}`
    }
    const veh = vehicles.find((v) => v.id === rule.vehicle_id)
    return veh ? `Individual · ${veh.patente}` : 'Individual'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {initialRules.length} regla{initialRules.length === 1 ? '' : 's'} configurada{initialRules.length === 1 ? '' : 's'}
        </p>
        {!showCreate && (
          <button
            type="button"
            onClick={() => {
              setForm(INITIAL_FORM)
              setShowCreate(true)
              setCreateError(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            <Plus size={14} />
            Nueva regla
          </button>
        )}
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Nueva regla</p>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-gray-400 hover:text-gray-700"
            >
              <X size={14} />
            </button>
          </div>

          {/* Scope */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700">Alcance:</label>
            <label className="inline-flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                checked={form.scope === 'global'}
                onChange={() => setForm((p) => ({ ...p, scope: 'global' }))}
              />
              Global (por categoría)
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                checked={form.scope === 'individual'}
                onChange={() => setForm((p) => ({ ...p, scope: 'individual' }))}
              />
              Individual (un vehículo)
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {form.scope === 'global' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, categoria: e.target.value as VehicleCategory }))
                  }
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <option value="auto">Auto</option>
                  <option value="camioneta">Camioneta</option>
                  <option value="camion">Camión</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vehículo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.vehicle_id}
                  onChange={(e) => setForm((p) => ({ ...p, vehicle_id: e.target.value }))}
                  required
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <option value="">Seleccionar...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.patente} — {v.marca} {v.modelo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de mantenimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.tipo_mantenimiento}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tipo_mantenimiento: e.target.value }))
                }
                placeholder="Ej. Service, Frenos, Correa"
                required
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Descripción <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Ej. Service cada 10.000 km — aceite y filtros"
                required
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Intervalo km
              </label>
              <input
                type="number"
                min={1}
                value={form.km_intervalo}
                onChange={(e) => setForm((p) => ({ ...p, km_intervalo: e.target.value }))}
                placeholder="Ej. 10000"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Intervalo días
              </label>
              <input
                type="number"
                min={1}
                value={form.dias_intervalo}
                onChange={(e) => setForm((p) => ({ ...p, dias_intervalo: e.target.value }))}
                placeholder="Ej. 180"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>

          {createError && <p className="text-xs text-red-500">{createError}</p>}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
              Guardar regla
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

      {/* Rules table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {initialRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-gray-500">
              No hay reglas de mantenimiento configuradas
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Creá la primera con el botón “Nueva regla”.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Alcance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Intervalo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {initialRules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {renderScope(rule)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {rule.tipo_mantenimiento}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[280px]">
                    <p className="truncate">{rule.descripcion}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {renderInterval(rule)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rule.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rule.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggle(rule.id, rule.is_active)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs disabled:opacity-50 ${
                          rule.is_active
                            ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        <Power size={12} />
                        {rule.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rule.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
