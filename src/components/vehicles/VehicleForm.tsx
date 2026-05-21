'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useState } from 'react'
import type { Vehicle } from '@/types/database'

const CURRENT_YEAR = new Date().getFullYear()

const vehicleSchema = z.object({
  marca: z.string().min(1, 'La marca es requerida'),
  modelo: z.string().min(1, 'El modelo es requerido'),
  anio: z
    .number({ message: 'El año debe ser un número' })
    .int('El año debe ser un entero')
    .min(1900, 'El año debe ser mayor a 1900')
    .max(CURRENT_YEAR + 1, `El año no puede superar ${CURRENT_YEAR + 1}`),
  patente: z.string().min(1, 'La patente es requerida'),
  categoria: z.enum(['auto', 'camioneta', 'camion'], {
    message: 'Seleccione una categoría',
  }),
  estado: z.enum(['activo', 'fuera_de_servicio', 'baja']),
  chasis: z.string().optional(),
  motor: z.string().optional(),
  observaciones: z.string().optional(),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

interface VehicleFormProps {
  defaultValues?: Partial<Vehicle>
  onSubmit: (formData: FormData) => Promise<{ error?: string } | void>
  submitLabel?: string
  cancelHref?: string
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1'
const ERROR_CLASS = 'mt-1 text-xs text-red-600'
const SECTION_TITLE_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4 pb-2 border-b border-gray-100'

export default function VehicleForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar vehículo',
  cancelHref = '/vehicles',
}: VehicleFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      marca: defaultValues?.marca ?? '',
      modelo: defaultValues?.modelo ?? '',
      anio: defaultValues?.anio ?? undefined,
      patente: defaultValues?.patente ?? '',
      categoria: defaultValues?.categoria ?? 'auto',
      estado: defaultValues?.estado ?? 'activo',
      chasis: defaultValues?.chasis ?? '',
      motor: defaultValues?.motor ?? '',
      observaciones: defaultValues?.observaciones ?? '',
    },
  })

  async function handleFormSubmit(values: VehicleFormValues) {
    setServerError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.set(key, String(value))
      }
    })

    try {
      const result = await onSubmit(formData)
      if (result && result.error) {
        setServerError(result.error)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      setServerError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Identificación */}
      <section>
        <h2 className={SECTION_TITLE_CLASS}>Identificación</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="marca">
              Marca <span className="text-red-500">*</span>
            </label>
            <input
              id="marca"
              type="text"
              {...register('marca')}
              className={INPUT_CLASS}
              placeholder="Toyota"
            />
            {errors.marca && (
              <p className={ERROR_CLASS}>{errors.marca.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="modelo">
              Modelo <span className="text-red-500">*</span>
            </label>
            <input
              id="modelo"
              type="text"
              {...register('modelo')}
              className={INPUT_CLASS}
              placeholder="Hilux"
            />
            {errors.modelo && (
              <p className={ERROR_CLASS}>{errors.modelo.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="anio">
              Año <span className="text-red-500">*</span>
            </label>
            <input
              id="anio"
              type="number"
              {...register('anio', { valueAsNumber: true })}
              className={INPUT_CLASS}
              placeholder="2020"
              min={1900}
              max={CURRENT_YEAR + 1}
            />
            {errors.anio && (
              <p className={ERROR_CLASS}>{errors.anio.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="patente">
              Patente <span className="text-red-500">*</span>
            </label>
            <input
              id="patente"
              type="text"
              {...register('patente')}
              className={`${INPUT_CLASS} uppercase`}
              placeholder="AA123BB"
              style={{ textTransform: 'uppercase' }}
            />
            {errors.patente && (
              <p className={ERROR_CLASS}>{errors.patente.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Clasificación */}
      <section>
        <h2 className={SECTION_TITLE_CLASS}>Clasificación</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="categoria">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              id="categoria"
              {...register('categoria')}
              className={INPUT_CLASS}
            >
              <option value="auto">Auto</option>
              <option value="camioneta">Camioneta</option>
              <option value="camion">Camión</option>
            </select>
            {errors.categoria && (
              <p className={ERROR_CLASS}>{errors.categoria.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="estado">
              Estado
            </label>
            <select
              id="estado"
              {...register('estado')}
              className={INPUT_CLASS}
            >
              <option value="activo">Activo</option>
              <option value="fuera_de_servicio">Fuera de servicio</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>
      </section>

      {/* Datos técnicos */}
      <section>
        <h2 className={SECTION_TITLE_CLASS}>Datos Técnicos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="chasis">
              N° de chasis
            </label>
            <input
              id="chasis"
              type="text"
              {...register('chasis')}
              className={INPUT_CLASS}
              placeholder="9BWZZZ377VT004251"
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="motor">
              N° de motor
            </label>
            <input
              id="motor"
              type="text"
              {...register('motor')}
              className={INPUT_CLASS}
              placeholder="T2D123456"
            />
          </div>
        </div>
      </section>

      {/* Observaciones */}
      <section>
        <h2 className={SECTION_TITLE_CLASS}>Observaciones</h2>
        <div>
          <label className={LABEL_CLASS} htmlFor="observaciones">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            {...register('observaciones')}
            rows={3}
            className={INPUT_CLASS}
            placeholder="Observaciones adicionales..."
          />
        </div>
      </section>

      {/* Actions */}
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
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
