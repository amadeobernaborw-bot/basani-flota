'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, List, LayoutGrid } from 'lucide-react'
import type { Vehicle, VehicleStatus, VehicleCategory } from '@/types/database'

const ESTADO_LABELS: Record<VehicleStatus, string> = {
  activo: 'Activo',
  fuera_de_servicio: 'Fuera de servicio',
  baja: 'Baja',
}

const ESTADO_CLASSES: Record<VehicleStatus, string> = {
  activo: 'bg-green-100 text-green-800',
  fuera_de_servicio: 'bg-yellow-100 text-yellow-800',
  baja: 'bg-red-100 text-red-800',
}

const ESTADO_ACCENT: Record<VehicleStatus, string> = {
  activo: 'border-l-green-500',
  fuera_de_servicio: 'border-l-yellow-400',
  baja: 'border-l-red-500',
}

const CATEGORIA_LABELS: Record<VehicleCategory, string> = {
  auto: 'Auto',
  camioneta: 'Camioneta',
  camion: 'Camión',
}

function ExpandedFields({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2 py-1 text-sm">
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Chasis</span>
        <span className="text-gray-700">{vehicle.chasis ?? '—'}</span>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Motor</span>
        <span className="text-gray-700">{vehicle.motor ?? '—'}</span>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Año</span>
        <span className="text-gray-700">{vehicle.anio}</span>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Categoría</span>
        <span className="text-gray-700">{CATEGORIA_LABELS[vehicle.categoria]}</span>
      </div>
      {vehicle.observaciones && (
        <div className="col-span-2">
          <span className="block text-[10px] uppercase tracking-wide text-gray-400">Observaciones</span>
          <span className="text-gray-700">{vehicle.observaciones}</span>
        </div>
      )}
      <div className="col-span-2 pt-1">
        <Link
          href={`/vehicles/${vehicle.id}`}
          className="text-xs font-medium text-gray-900 hover:underline"
        >
          Ver perfil completo →
        </Link>
      </div>
    </div>
  )
}

interface Props {
  vehicles: Vehicle[]
  isAdmin: boolean
  viewMode: 'table' | 'cards'
  tableToggleUrl: string
  cardsToggleUrl: string
}

export default function VehicleListView({
  vehicles,
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

  if (vehicles.length === 0) {
    return <>{toggleButtons}</>
  }

  if (viewMode === 'cards') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{toggleButtons}</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => {
            const isExpanded = expandedId === vehicle.id
            return (
              <div
                key={vehicle.id}
                className={`rounded-xl border border-gray-200 border-l-4 bg-white shadow-sm overflow-hidden ${ESTADO_ACCENT[vehicle.estado]}`}
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/vehicles/${vehicle.id}`}
                      className="font-semibold text-gray-900 hover:underline tracking-wide leading-snug"
                    >
                      {vehicle.patente}
                    </Link>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASSES[vehicle.estado]}`}
                    >
                      {ESTADO_LABELS[vehicle.estado]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {vehicle.marca} {vehicle.modelo} · {vehicle.anio}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {CATEGORIA_LABELS[vehicle.categoria]}
                  </p>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <ExpandedFields vehicle={vehicle} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggle(vehicle.id)}
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
                Patente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Marca / Modelo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Año
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Categoría
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => {
              const isExpanded = expandedId === vehicle.id
              return (
                <>
                  <tr
                    key={vehicle.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(vehicle.id)}
                        className="flex items-center justify-center rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title={isExpanded ? 'Ocultar detalles' : 'Ver más detalles'}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 tracking-wide">
                      {vehicle.patente}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {vehicle.marca} {vehicle.modelo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vehicle.anio}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {CATEGORIA_LABELS[vehicle.categoria]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASSES[vehicle.estado]}`}
                      >
                        {ESTADO_LABELS[vehicle.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-gray-600"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${vehicle.id}-expand`} className="bg-gray-50 border-b border-gray-100">
                      <td colSpan={7} className="px-6 py-4">
                        <ExpandedFields vehicle={vehicle} />
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
