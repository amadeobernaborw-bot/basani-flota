'use client'

import { useState, useEffect } from 'react'
import { addDriverHistory, getActiveEmployees } from '@/lib/actions/vehicles'
import type { VehicleDriverHistory, Employee } from '@/types/database'

interface DriverHistorySectionProps {
  vehicleId: string
  history: VehicleDriverHistory[]
  isAdmin: boolean
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1'

type ActiveEmployee = Pick<Employee, 'id' | 'nombre' | 'apellido' | 'dni'>

export default function DriverHistorySection({
  vehicleId,
  history,
  isAdmin,
}: DriverHistorySectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<ActiveEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  const [localHistory, setLocalHistory] = useState<VehicleDriverHistory[]>(history)

  useEffect(() => {
    if (showForm && employees.length === 0) {
      setLoadingEmployees(true)
      getActiveEmployees()
        .then(({ data }) => setEmployees(data))
        .finally(() => setLoadingEmployees(false))
    }
  }, [showForm, employees.length])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await addDriverHistory(vehicleId, formData)
      if (result.error) {
        setFormError(result.error)
        return
      }

      // Refresh page data via a soft reload workaround
      window.location.reload()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* History table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {localHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">Sin historial de conductores</p>
            <p className="mt-1 text-xs text-gray-400">
              Agregue el primer conductor asignado a este vehículo.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Empleado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  DNI
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fecha inicio
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fecha fin
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody>
              {localHistory.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {entry.employee
                      ? `${entry.employee.apellido}, ${entry.employee.nombre}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.employee?.dni ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(entry.fecha_inicio)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.fecha_fin ? (
                      formatDate(entry.fecha_fin)
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Actual
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.observaciones ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add driver form — admin only */}
      {isAdmin && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Agregar conductor</h3>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
              >
                Agregar
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={LABEL_CLASS} htmlFor="employee_id">
                    Empleado <span className="text-red-500">*</span>
                  </label>
                  {loadingEmployees ? (
                    <div className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-400 bg-gray-50">
                      Cargando empleados...
                    </div>
                  ) : (
                    <select
                      id="employee_id"
                      name="employee_id"
                      required
                      className={INPUT_CLASS}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Seleccione un empleado...
                      </option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.apellido}, {emp.nombre} — DNI {emp.dni}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className={LABEL_CLASS} htmlFor="fecha_inicio">
                    Fecha de inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fecha_inicio"
                    name="fecha_inicio"
                    type="date"
                    required
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS} htmlFor="fecha_fin">
                    Fecha de fin
                  </label>
                  <input
                    id="fecha_fin"
                    name="fecha_fin"
                    type="date"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={LABEL_CLASS} htmlFor="observaciones_conductor">
                    Observaciones
                  </label>
                  <textarea
                    id="observaciones_conductor"
                    name="observaciones"
                    rows={2}
                    className={INPUT_CLASS}
                    placeholder="Observaciones opcionales..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormError(null)
                  }}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || loadingEmployees}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar conductor'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
