'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { createMileageLog } from '@/lib/actions/mileage'

interface VehicleOption {
  id: string
  patente: string
  marca: string
  modelo: string
}

interface MileageFormProps {
  vehicles: VehicleOption[]
  presetVehicleId?: string
  onSuccess?: () => void
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function MileageForm({
  vehicles,
  presetVehicleId,
  onSuccess,
}: MileageFormProps) {
  const now = new Date()
  const [isPending, startTransition] = useTransition()
  const [vehicleId, setVehicleId] = useState(presetVehicleId ?? '')
  const [kilometraje, setKilometraje] = useState('')
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [fechaRegistro, setFechaRegistro] = useState(
    now.toISOString().slice(0, 10)
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const fd = new FormData()
    fd.set('vehicle_id', vehicleId)
    fd.set('kilometraje', kilometraje)
    fd.set('mes', String(mes))
    fd.set('anio', String(anio))
    fd.set('fecha_registro', fechaRegistro)

    startTransition(async () => {
      const result = await createMileageLog(fd)
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(`Kilometraje registrado para ${String(mes).padStart(2, '0')}/${anio}.`)
      setKilometraje('')
      if (onSuccess) onSuccess()
    })
  }

  const yearOptions: number[] = []
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 5; y--) {
    yearOptions.push(y)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
    >
      <h3 className="text-sm font-semibold text-gray-800">Registrar kilometraje</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Vehículo <span className="text-red-500">*</span>
          </label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
            disabled={Boolean(presetVehicleId)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
          >
            <option value="">Seleccionar vehículo...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.patente} — {v.marca} {v.modelo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Kilometraje <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            value={kilometraje}
            onChange={(e) => setKilometraje(e.target.value)}
            required
            placeholder="Ej. 125400"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha de registro
          </label>
          <input
            type="date"
            value={fechaRegistro}
            onChange={(e) => setFechaRegistro(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Mes <span className="text-red-500">*</span>
          </label>
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value, 10))}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {MONTHS.map((label, idx) => (
              <option key={idx} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Año <span className="text-red-500">*</span>
          </label>
          <select
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value, 10))}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {success}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Registrar
        </button>
      </div>
    </form>
  )
}
