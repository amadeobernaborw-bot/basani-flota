'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, List, LayoutGrid } from 'lucide-react'
import type { Employee, EmployeeStatus, EmployeeCategory } from '@/types/database'

const ESTADO_LABELS: Record<EmployeeStatus, string> = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  baja: 'Baja',
}

const ESTADO_CLASSES: Record<EmployeeStatus, string> = {
  activo: 'bg-green-100 text-green-800',
  suspendido: 'bg-yellow-100 text-yellow-800',
  baja: 'bg-red-100 text-red-800',
}

const ESTADO_ACCENT: Record<EmployeeStatus, string> = {
  activo: 'border-l-green-500',
  suspendido: 'border-l-yellow-400',
  baja: 'border-l-red-500',
}

const CATEGORIA_LABELS: Record<EmployeeCategory, string> = {
  operario: 'Operario',
  camionero: 'Camionero',
  administrativo: 'Administrativo',
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function ExpandedFields({ employee }: { employee: Employee }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2 py-1 text-sm">
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">CUIL</span>
        <span className="text-gray-700">{employee.cuil ?? '—'}</span>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Teléfono</span>
        <span className="text-gray-700">{employee.telefono ?? '—'}</span>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Email</span>
        <span className="text-gray-700 break-all">{employee.email ?? '—'}</span>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Fecha de Nac.</span>
        <span className="text-gray-700">{formatDate(employee.fecha_nacimiento)}</span>
      </div>
      <div className="col-span-2">
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Dirección</span>
        <span className="text-gray-700">{employee.direccion ?? '—'}</span>
      </div>
      <div className="col-span-2">
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Contacto Emergencia</span>
        <span className="text-gray-700">{employee.contacto_emergencia ?? '—'}</span>
      </div>
      {employee.observaciones && (
        <div className="col-span-2">
          <span className="block text-[10px] uppercase tracking-wide text-gray-400">Observaciones</span>
          <span className="text-gray-700">{employee.observaciones}</span>
        </div>
      )}
      <div className="col-span-2 pt-1">
        <Link
          href={`/employees/${employee.id}`}
          className="text-xs font-medium text-gray-900 hover:underline"
        >
          Ver perfil completo →
        </Link>
      </div>
    </div>
  )
}

interface Props {
  employees: Employee[]
  isAdmin: boolean
  viewMode: 'table' | 'cards'
  tableToggleUrl: string
  cardsToggleUrl: string
}

export default function EmployeeListView({
  employees,
  isAdmin: _isAdmin,
  viewMode,
  tableToggleUrl,
  cardsToggleUrl,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const toggleButtons = (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      <Link
        href={tableToggleUrl}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
          viewMode === 'table'
            ? 'bg-gray-900 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <List size={15} />
        <span className="hidden sm:inline">Lista</span>
      </Link>
      <Link
        href={cardsToggleUrl}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-gray-200 ${
          viewMode === 'cards'
            ? 'bg-gray-900 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <LayoutGrid size={15} />
        <span className="hidden sm:inline">Tarjetas</span>
      </Link>
    </div>
  )

  if (employees.length === 0) {
    return <>{toggleButtons}</>
  }

  if (viewMode === 'cards') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{toggleButtons}</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => {
            const isExpanded = expandedId === employee.id
            return (
              <div
                key={employee.id}
                className={`rounded-xl border border-gray-200 border-l-4 bg-white shadow-sm overflow-hidden ${ESTADO_ACCENT[employee.estado]}`}
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/employees/${employee.id}`}
                      className="font-semibold text-gray-900 hover:underline leading-snug"
                    >
                      {employee.apellido}, {employee.nombre}
                    </Link>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASSES[employee.estado]}`}
                    >
                      {ESTADO_LABELS[employee.estado]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {CATEGORIA_LABELS[employee.categoria]} · DNI {employee.dni}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Ingreso: {formatDate(employee.fecha_ingreso)}
                  </p>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <ExpandedFields employee={employee} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggle(employee.id)}
                  className="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp size={14} /> Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} /> Ver más
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Table view
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{toggleButtons}</div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Nombre / Apellido
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                DNI
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Categoría
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Fecha ingreso
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const isExpanded = expandedId === employee.id
              return (
                <>
                  <tr
                    key={employee.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(employee.id)}
                        className="flex items-center justify-center rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title={isExpanded ? 'Ocultar detalles' : 'Ver más detalles'}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {employee.apellido}, {employee.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{employee.dni}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {CATEGORIA_LABELS[employee.categoria]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASSES[employee.estado]}`}
                      >
                        {ESTADO_LABELS[employee.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(employee.fecha_ingreso)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/employees/${employee.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-gray-600"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${employee.id}-expand`} className="bg-gray-50 border-b border-gray-100">
                      <td colSpan={7} className="px-6 py-4">
                        <ExpandedFields employee={employee} />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
