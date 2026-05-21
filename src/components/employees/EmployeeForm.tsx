'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useState } from 'react'
import type { Employee } from '@/types/database'

const employeeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  dni: z.string().min(1, 'El DNI es requerido'),
  cuil: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  contacto_emergencia: z.string().optional(),
  categoria: z.enum(['operario', 'camionero', 'administrativo'], {
    message: 'Seleccione una categoría',
  }),
  fecha_ingreso: z.string().min(1, 'La fecha de ingreso es requerida'),
  fecha_egreso: z.string().optional(),
  estado: z.enum(['activo', 'suspendido', 'baja']),
  observaciones: z.string().optional(),
})

type EmployeeFormValues = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  defaultValues?: Partial<Employee>
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

export default function EmployeeForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar empleado',
  cancelHref = '/employees',
}: EmployeeFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? '',
      apellido: defaultValues?.apellido ?? '',
      dni: defaultValues?.dni ?? '',
      cuil: defaultValues?.cuil ?? '',
      fecha_nacimiento: defaultValues?.fecha_nacimiento ?? '',
      direccion: defaultValues?.direccion ?? '',
      telefono: defaultValues?.telefono ?? '',
      email: defaultValues?.email ?? '',
      contacto_emergencia: defaultValues?.contacto_emergencia ?? '',
      categoria: defaultValues?.categoria ?? 'operario',
      fecha_ingreso: defaultValues?.fecha_ingreso ?? '',
      fecha_egreso: defaultValues?.fecha_egreso ?? '',
      estado: defaultValues?.estado ?? 'activo',
      observaciones: defaultValues?.observaciones ?? '',
    },
  })

  async function handleFormSubmit(values: EmployeeFormValues) {
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

      {/* Datos Personales */}
      <section>
        <h2 className={SECTION_TITLE_CLASS}>Datos Personales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="nombre">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              {...register('nombre')}
              className={INPUT_CLASS}
              placeholder="Juan"
            />
            {errors.nombre && (
              <p className={ERROR_CLASS}>{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="apellido">
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              id="apellido"
              type="text"
              {...register('apellido')}
              className={INPUT_CLASS}
              placeholder="Pérez"
            />
            {errors.apellido && (
              <p className={ERROR_CLASS}>{errors.apellido.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="dni">
              DNI <span className="text-red-500">*</span>
            </label>
            <input
              id="dni"
              type="text"
              {...register('dni')}
              className={INPUT_CLASS}
              placeholder="12345678"
            />
            {errors.dni && (
              <p className={ERROR_CLASS}>{errors.dni.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="cuil">
              CUIL
            </label>
            <input
              id="cuil"
              type="text"
              {...register('cuil')}
              className={INPUT_CLASS}
              placeholder="20-12345678-9"
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="fecha_nacimiento">
              Fecha de nacimiento
            </label>
            <input
              id="fecha_nacimiento"
              type="date"
              {...register('fecha_nacimiento')}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="telefono">
              Teléfono
            </label>
            <input
              id="telefono"
              type="tel"
              {...register('telefono')}
              className={INPUT_CLASS}
              placeholder="+54 9 299 000 0000"
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={INPUT_CLASS}
              placeholder="juan@ejemplo.com"
            />
            {errors.email && (
              <p className={ERROR_CLASS}>{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="contacto_emergencia">
              Contacto de emergencia
            </label>
            <input
              id="contacto_emergencia"
              type="text"
              {...register('contacto_emergencia')}
              className={INPUT_CLASS}
              placeholder="Nombre y teléfono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="direccion">
              Dirección
            </label>
            <input
              id="direccion"
              type="text"
              {...register('direccion')}
              className={INPUT_CLASS}
              placeholder="Calle 123, Neuquén"
            />
          </div>
        </div>
      </section>

      {/* Datos Laborales */}
      <section>
        <h2 className={SECTION_TITLE_CLASS}>Datos Laborales</h2>
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
              <option value="operario">Operario</option>
              <option value="camionero">Camionero</option>
              <option value="administrativo">Administrativo</option>
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
              <option value="suspendido">Suspendido</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="fecha_ingreso">
              Fecha de ingreso <span className="text-red-500">*</span>
            </label>
            <input
              id="fecha_ingreso"
              type="date"
              {...register('fecha_ingreso')}
              className={INPUT_CLASS}
            />
            {errors.fecha_ingreso && (
              <p className={ERROR_CLASS}>{errors.fecha_ingreso.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="fecha_egreso">
              Fecha de egreso
            </label>
            <input
              id="fecha_egreso"
              type="date"
              {...register('fecha_egreso')}
              className={INPUT_CLASS}
            />
          </div>

          <div className="sm:col-span-2">
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
