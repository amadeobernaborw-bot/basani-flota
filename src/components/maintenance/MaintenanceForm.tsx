'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { MaintenanceEvent } from '@/types/database'

const formSchema = z.object({
  vehicle_id: z.string().min(1, 'Seleccione un vehículo'),
  tipo: z.enum(['preventivo', 'correctivo']),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  kilometraje: z.string().optional(),
  proximo_kilometraje: z.string().optional(),
  proxima_revision: z.string().optional(),
  observaciones: z.string().optional(),
  estado: z.enum(['pendiente', 'completado', 'vencido']),
})

type FormValues = z.infer<typeof formSchema>

interface VehicleOption {
  id: string
  patente: string
  marca: string
  modelo: string
}

interface MaintenanceFormProps {
  vehicles: VehicleOption[]
  defaultValues?: Partial<MaintenanceEvent>
  lockVehicle?: boolean
  onSubmit: (formData: FormData) => Promise<{ error?: string } | void>
  submitLabel?: string
  cancelHref?: string
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1'
const ERROR_CLASS = 'mt-1 text-xs text-red-600'

export default function MaintenanceForm({
  vehicles,
  defaultValues,
  lockVehicle = false,
  onSubmit,
  submitLabel = 'Guardar evento',
  cancelHref = '/maintenance',
}: MaintenanceFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_id: defaultValues?.vehicle_id ?? '',
      tipo: defaultValues?.tipo ?? 'preventivo',
      descripcion: defaultValues?.descripcion ?? '',
      fecha: defaultValues?.fecha ?? new Date().toISOString().slice(0, 10),
      kilometraje:
        defaultValues?.kilometraje !== undefined && defaultValues?.kilometraje !== null
          ? String(defaultValues.kilometraje)
          : '',
      proximo_kilometraje:
        defaultValues?.proximo_kilometraje !== undefined && defaultValues?.proximo_kilometraje !== null
          ? String(defaultValues.proximo_kilometraje)
          : '',
      proxima_revision: defaultValues?.proxima_revision ?? '',
      observaciones: defaultValues?.observaciones ?? '',
      estado: defaultValues?.estado ?? 'pendiente',
    },
  })

  async function handleFormSubmit(values: FormValues) {
    setServerError(null)
    setIsSubmitting(true)
    const formData = new FormData()
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.set(k, String(v))
    })
    try {
      const result = await onSubmit(formData)
      if (result && result.error) setServerError(result.error)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={LABEL_CLASS} htmlFor="vehicle_id">
            Vehículo <span className="text-red-500">*</span>
          </label>
          <select
            id="vehicle_id"
            {...register('vehicle_id')}
            disabled={lockVehicle}
            className={`${INPUT_CLASS} ${lockVehicle ? 'bg-gray-100' : ''}`}
          >
            <option value="">Seleccionar vehículo...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.patente} — {v.marca} {v.modelo}
              </option>
            ))}
          </select>
          {errors.vehicle_id && (
            <p className={ERROR_CLASS}>{errors.vehicle_id.message}</p>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="tipo">
            Tipo <span className="text-red-500">*</span>
          </label>
          <select id="tipo" {...register('tipo')} className={INPUT_CLASS}>
            <option value="preventivo">Preventivo</option>
            <option value="correctivo">Correctivo</option>
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="estado">
            Estado
          </label>
          <select id="estado" {...register('estado')} className={INPUT_CLASS}>
            <option value="pendiente">Pendiente</option>
            <option value="completado">Completado</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL_CLASS} htmlFor="descripcion">
            Descripción <span className="text-red-500">*</span>
          </label>
          <input
            id="descripcion"
            type="text"
            {...register('descripcion')}
            placeholder="Ej. Service 30.000 km, cambio de aceite y filtros"
            className={INPUT_CLASS}
          />
          {errors.descripcion && (
            <p className={ERROR_CLASS}>{errors.descripcion.message}</p>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="fecha">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            id="fecha"
            type="date"
            {...register('fecha')}
            className={INPUT_CLASS}
          />
          {errors.fecha && <p className={ERROR_CLASS}>{errors.fecha.message}</p>}
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="kilometraje">
            Kilometraje
          </label>
          <input
            id="kilometraje"
            type="number"
            min={0}
            {...register('kilometraje')}
            placeholder="Ej. 45000"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="proximo_kilometraje">
            Próximo kilometraje
          </label>
          <input
            id="proximo_kilometraje"
            type="number"
            min={0}
            {...register('proximo_kilometraje')}
            placeholder="Ej. 60000"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="proxima_revision">
            Próxima revisión
          </label>
          <input
            id="proxima_revision"
            type="date"
            {...register('proxima_revision')}
            className={INPUT_CLASS}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL_CLASS} htmlFor="observaciones">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            rows={3}
            {...register('observaciones')}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
        <Link
          href={cancelHref}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
