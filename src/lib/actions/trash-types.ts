export const TRASH_RETENTION_DAYS = 30

export type TrashEntityType =
  | 'employee'
  | 'vehicle'
  | 'employee_document'
  | 'vehicle_document'
  | 'maintenance_event'

export interface TrashedItem {
  id: string
  entity_type: TrashEntityType
  label: string
  sublabel: string | null
  deleted_at: string
  days_remaining: number
}
