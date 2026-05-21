'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Truck,
  Wrench,
  Gauge,
  Calendar,
  Bell,
  Settings,
  Trash2,
  LogOut,
} from 'lucide-react'
import type { UserRole } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import GlobalSearch from '@/components/shared/GlobalSearch'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Empleados', href: '/employees', icon: Users },
  { label: 'Vehículos', href: '/vehicles', icon: Truck },
  { label: 'Mantenimiento', href: '/maintenance', icon: Wrench },
  { label: 'Kilometraje', href: '/mileage', icon: Gauge },
  { label: 'Calendario', href: '/calendar', icon: Calendar },
  { label: 'Alertas', href: '/alerts', icon: Bell },
  { label: 'Papelera', href: '/trash', icon: Trash2, adminOnly: true },
  { label: 'Configuración', href: '/settings', icon: Settings, adminOnly: true },
]

interface SidebarProps {
  role: UserRole
  userEmail: string
  alertCount?: number
}

export default function Sidebar({ role, userEmail, alertCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === 'admin'
  )

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white border-r border-gray-200">
      {/* Brand */}
      <div className="flex h-16 items-center px-6 border-b border-gray-100">
        <span className="text-lg font-bold text-gray-900 tracking-tight">
          Basani
        </span>
      </div>

      {/* Global search */}
      <div className="px-3 pt-3">
        <GlobalSearch />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon
                size={18}
                className={isActive ? 'text-gray-900' : 'text-gray-500'}
              />
              <span className="flex-1">{item.label}</span>
              {item.href === '/alerts' && alertCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer — user info + logout */}
      <div className="border-t border-gray-100 px-4 py-4">
        <div className="mb-3">
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          <p className="text-xs font-medium text-gray-700 capitalize">
            {role === 'admin' ? 'Administrador' : 'Lector'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
