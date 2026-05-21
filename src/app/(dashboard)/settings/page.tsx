import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllDocumentTypes } from '@/lib/actions/document-types'
import {
  getMaintenanceRules,
  getActiveVehiclesForMaintenance,
} from '@/lib/actions/maintenance'
import DocumentTypesManager from '@/components/settings/DocumentTypesManager'
import MaintenanceRulesManager from '@/components/settings/MaintenanceRulesManager'
import type { Profile } from '@/types/database'

export default async function SettingsPage() {
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

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const [
    { data: documentTypes, error },
    { data: maintenanceRules, error: rulesError },
    { data: maintenanceVehicles },
  ] = await Promise.all([
    getAllDocumentTypes(),
    getMaintenanceRules({ includeInactive: true }),
    getActiveVehiclesForMaintenance(),
  ])

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configurá los tipos de documentos del sistema.
        </p>
      </div>

      {/* Document Types section */}
      <section className="space-y-4">
        <div className="border-b border-gray-100 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Tipos de documentos
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            Los tipos definen qué documentos se pueden registrar para empleados y vehículos.
            Desactivar un tipo no borra los documentos existentes — solo lo oculta al crear nuevos.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Error al cargar tipos de documentos: {error}
          </div>
        ) : (
          <DocumentTypesManager initialTypes={documentTypes} />
        )}
      </section>

      {/* Maintenance Rules section */}
      <section className="space-y-4">
        <div className="border-b border-gray-100 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Reglas de mantenimiento
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            Configurá reglas globales por categoría (camiones, camionetas, autos) o reglas individuales por vehículo.
            Indicá un intervalo en kilómetros, días, o ambos.
          </p>
        </div>

        {rulesError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Error al cargar reglas de mantenimiento: {rulesError}
          </div>
        ) : (
          <MaintenanceRulesManager
            initialRules={maintenanceRules}
            vehicles={maintenanceVehicles}
          />
        )}
      </section>

    </div>
  )
}
