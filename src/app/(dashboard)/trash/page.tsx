import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, Users, Truck, FileText, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTrashedItems } from '@/lib/actions/trash'
import {
  TRASH_RETENTION_DAYS,
  type TrashEntityType,
  type TrashedItem,
} from '@/lib/actions/trash-types'
import TrashRowActions from '@/components/trash/TrashRowActions'
import CleanupButton from '@/components/trash/CleanupButton'
import type { Profile } from '@/types/database'

const TYPE_CONFIG: Record<
  TrashEntityType,
  { label: string; icon: React.ElementType; iconColor: string; iconBg: string }
> = {
  employee: {
    label: 'Empleado',
    icon: Users,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50',
  },
  vehicle: {
    label: 'Vehículo',
    icon: Truck,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  employee_document: {
    label: 'Doc. Empleado',
    icon: FileText,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
  },
  vehicle_document: {
    label: 'Doc. Vehículo',
    icon: FileText,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50',
  },
  maintenance_event: {
    label: 'Mantenimiento',
    icon: Wrench,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
}

const FILTER_OPTIONS: { value: '' | TrashEntityType; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'employee', label: 'Empleados' },
  { value: 'vehicle', label: 'Vehículos' },
  { value: 'employee_document', label: 'Doc. Empleados' },
  { value: 'vehicle_document', label: 'Doc. Vehículos' },
  { value: 'maintenance_event', label: 'Mantenimiento' },
]

function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
  } catch {
    return iso
  }
}

function daysLeftLabel(days: number): { text: string; className: string } {
  if (days === 0) {
    return {
      text: 'Expirado',
      className: 'bg-red-100 text-red-800 border-red-200',
    }
  }
  if (days <= 7) {
    return {
      text: `${days} día${days === 1 ? '' : 's'}`,
      className: 'bg-red-50 text-red-700 border-red-100',
    }
  }
  if (days <= 14) {
    return {
      text: `${days} días`,
      className: 'bg-yellow-50 text-yellow-800 border-yellow-100',
    }
  }
  return {
    text: `${days} días`,
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  }
}

interface TrashPageProps {
  searchParams: Promise<{ tipo?: string }>
}

function isTrashEntityType(value: string): value is TrashEntityType {
  return ['employee', 'vehicle', 'employee_document', 'vehicle_document'].includes(value)
}

export default async function TrashPage({ searchParams }: TrashPageProps) {
  const params = await searchParams
  const filter = params.tipo && isTrashEntityType(params.tipo) ? params.tipo : ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<Pick<Profile, 'role'>>()

  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    redirect('/dashboard')
  }

  const { items, error } = await getTrashedItems()

  const filteredItems = filter
    ? items.filter((i) => i.entity_type === filter)
    : items

  const expiredCount = items.filter((i) => i.days_remaining === 0).length

  function TrashRow({ item }: { item: TrashedItem }) {
    const config = TYPE_CONFIG[item.entity_type]
    const Icon = config.icon
    const daysInfo = daysLeftLabel(item.days_remaining)

    return (
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.iconBg}`}
            >
              <Icon size={14} className={config.iconColor} />
            </div>
            <span className="text-xs text-gray-500">{config.label}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-900">{item.label}</p>
          {item.sublabel && (
            <p className="text-xs text-gray-500 mt-0.5">{item.sublabel}</p>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {formatDateTime(item.deleted_at)}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${daysInfo.className}`}
          >
            {daysInfo.text}
          </span>
        </td>
        <td className="px-4 py-3">
          <TrashRowActions
            id={item.id}
            type={item.entity_type}
            label={item.label}
          />
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Papelera</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700">
              {items.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Los elementos eliminados se conservan {TRASH_RETENTION_DAYS} días y luego se borran definitivamente.
          </p>
        </div>
        <CleanupButton expiredCount={expiredCount} />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm w-fit">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.value
          const href = opt.value === '' ? '/trash' : `/trash?tipo=${opt.value}`
          return (
            <Link
              key={opt.value}
              href={href}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </Link>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trash2 size={32} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              {filter ? 'No hay elementos de este tipo en la papelera' : 'La papelera está vacía'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Los elementos eliminados aparecerán aquí.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Elemento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Eliminado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Días restantes
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <TrashRow
                  key={`${item.entity_type}-${item.id}`}
                  item={item}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
