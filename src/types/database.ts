export type UserRole = 'admin' | 'reader'
export type EmployeeStatus = 'activo' | 'suspendido' | 'baja'
export type EmployeeCategory = 'operario' | 'camionero' | 'administrativo'
export type VehicleCategory = 'auto' | 'camioneta' | 'camion'
export type VehicleStatus = 'activo' | 'fuera_de_servicio' | 'baja'
export type DocumentAppliesTo = 'employee' | 'vehicle' | 'both'
export type MaintenanceEventStatus = 'pendiente' | 'completado' | 'vencido'
export type AlertStatus = 'pendiente' | 'completada'
export type AlertType =
  | 'vencimiento_documento'
  | 'mantenimiento_pendiente'
  | 'revision_pendiente'
  | 'error_kilometraje'
export type MileageSource = 'manual' | 'email'

export interface Profile {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface DocumentType {
  id: string
  nombre: string
  aplica_a: DocumentAppliesTo
  requiere_vencimiento: boolean
  is_active: boolean
  orden: number
  created_at: string
}

export interface Employee {
  id: string
  nombre: string
  apellido: string
  dni: string
  cuil: string | null
  fecha_nacimiento: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  contacto_emergencia: string | null
  categoria: EmployeeCategory
  fecha_ingreso: string
  fecha_egreso: string | null
  estado: EmployeeStatus
  observaciones: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface EmployeeDocument {
  id: string
  employee_id: string
  type_id: string
  numero: string | null
  fecha_emision: string | null
  fecha_vencimiento: string | null
  sin_vencimiento: boolean
  estado: string
  observaciones: string | null
  comentarios: string | null
  version: number
  is_current: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  document_type?: DocumentType
}

export interface EmployeeDocumentFile {
  id: string
  document_id: string
  storage_path: string
  file_name: string
  file_type: string
  file_size: number
  created_at: string
}

export interface Vehicle {
  id: string
  marca: string
  modelo: string
  anio: number
  patente: string
  chasis: string | null
  motor: string | null
  categoria: VehicleCategory
  estado: VehicleStatus
  observaciones: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface VehicleDocument {
  id: string
  vehicle_id: string
  type_id: string
  numero: string | null
  fecha_emision: string | null
  fecha_vencimiento: string | null
  sin_vencimiento: boolean
  estado: string
  observaciones: string | null
  comentarios: string | null
  version: number
  is_current: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  document_type?: DocumentType
}

export interface VehicleDocumentFile {
  id: string
  document_id: string
  storage_path: string
  file_name: string
  file_type: string
  file_size: number
  created_at: string
}

export interface VehicleDriverHistory {
  id: string
  vehicle_id: string
  employee_id: string
  fecha_inicio: string
  fecha_fin: string | null
  observaciones: string | null
  created_at: string
  employee?: Pick<Employee, 'nombre' | 'apellido' | 'dni'>
}

export interface MaintenanceRule {
  id: string
  categoria: VehicleCategory | null
  tipo_mantenimiento: string
  descripcion: string
  km_intervalo: number | null
  dias_intervalo: number | null
  is_global: boolean
  vehicle_id: string | null
  is_active: boolean
  created_at: string
}

export interface MaintenanceEvent {
  id: string
  vehicle_id: string
  rule_id: string | null
  tipo: 'preventivo' | 'correctivo'
  descripcion: string
  fecha: string
  kilometraje: number | null
  proximo_kilometraje: number | null
  proxima_revision: string | null
  observaciones: string | null
  estado: MaintenanceEventStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
  vehicle?: Pick<Vehicle, 'marca' | 'modelo' | 'patente'>
}

export interface MileageLog {
  id: string
  vehicle_id: string
  kilometraje: number
  fecha_registro: string
  mes: number
  anio: number
  fuente: MileageSource
  created_at: string
  vehicle?: Pick<Vehicle, 'patente' | 'marca' | 'modelo'>
}

export interface Alert {
  id: string
  tipo: AlertType
  entity_type: 'employee' | 'vehicle' | 'maintenance' | 'mileage'
  entity_id: string
  titulo: string
  descripcion: string
  estado: AlertStatus
  due_date: string | null
  created_at: string
  completed_at: string | null
}
