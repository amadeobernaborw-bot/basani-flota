-- ============================================================
-- Basani — Row Level Security Policies
-- Run AFTER schema.sql. Safe to re-run (idempotent).
-- ============================================================

-- Helper: check if the current user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- DOCUMENT TYPES
-- ============================================================
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_types_select" ON public.document_types;
CREATE POLICY "document_types_select"
  ON public.document_types
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "document_types_insert_admin" ON public.document_types;
CREATE POLICY "document_types_insert_admin"
  ON public.document_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "document_types_update_admin" ON public.document_types;
CREATE POLICY "document_types_update_admin"
  ON public.document_types
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "document_types_delete_admin" ON public.document_types;
CREATE POLICY "document_types_delete_admin"
  ON public.document_types
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- EMPLOYEES
-- ============================================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "employees_select_deleted_admin" ON public.employees;
CREATE POLICY "employees_select_deleted_admin"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "employees_insert_admin" ON public.employees;
CREATE POLICY "employees_insert_admin"
  ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employees_update_admin" ON public.employees;
CREATE POLICY "employees_update_admin"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employees_delete_admin" ON public.employees;
CREATE POLICY "employees_delete_admin"
  ON public.employees
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- EMPLOYEE DOCUMENTS
-- ============================================================
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_documents_select" ON public.employee_documents;
CREATE POLICY "employee_documents_select"
  ON public.employee_documents
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "employee_documents_select_deleted_admin" ON public.employee_documents;
CREATE POLICY "employee_documents_select_deleted_admin"
  ON public.employee_documents
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "employee_documents_insert_admin" ON public.employee_documents;
CREATE POLICY "employee_documents_insert_admin"
  ON public.employee_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employee_documents_update_admin" ON public.employee_documents;
CREATE POLICY "employee_documents_update_admin"
  ON public.employee_documents
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employee_documents_delete_admin" ON public.employee_documents;
CREATE POLICY "employee_documents_delete_admin"
  ON public.employee_documents
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- EMPLOYEE DOCUMENT FILES
-- ============================================================
ALTER TABLE public.employee_document_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_document_files_select" ON public.employee_document_files;
CREATE POLICY "employee_document_files_select"
  ON public.employee_document_files
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "employee_document_files_insert_admin" ON public.employee_document_files;
CREATE POLICY "employee_document_files_insert_admin"
  ON public.employee_document_files
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employee_document_files_delete_admin" ON public.employee_document_files;
CREATE POLICY "employee_document_files_delete_admin"
  ON public.employee_document_files
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- VEHICLES
-- ============================================================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
CREATE POLICY "vehicles_select"
  ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "vehicles_select_deleted_admin" ON public.vehicles;
CREATE POLICY "vehicles_select_deleted_admin"
  ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "vehicles_insert_admin" ON public.vehicles;
CREATE POLICY "vehicles_insert_admin"
  ON public.vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicles_update_admin" ON public.vehicles;
CREATE POLICY "vehicles_update_admin"
  ON public.vehicles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicles_delete_admin" ON public.vehicles;
CREATE POLICY "vehicles_delete_admin"
  ON public.vehicles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- VEHICLE DOCUMENTS
-- ============================================================
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_documents_select" ON public.vehicle_documents;
CREATE POLICY "vehicle_documents_select"
  ON public.vehicle_documents
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "vehicle_documents_select_deleted_admin" ON public.vehicle_documents;
CREATE POLICY "vehicle_documents_select_deleted_admin"
  ON public.vehicle_documents
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "vehicle_documents_insert_admin" ON public.vehicle_documents;
CREATE POLICY "vehicle_documents_insert_admin"
  ON public.vehicle_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicle_documents_update_admin" ON public.vehicle_documents;
CREATE POLICY "vehicle_documents_update_admin"
  ON public.vehicle_documents
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicle_documents_delete_admin" ON public.vehicle_documents;
CREATE POLICY "vehicle_documents_delete_admin"
  ON public.vehicle_documents
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- VEHICLE DOCUMENT FILES
-- ============================================================
ALTER TABLE public.vehicle_document_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_document_files_select" ON public.vehicle_document_files;
CREATE POLICY "vehicle_document_files_select"
  ON public.vehicle_document_files
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "vehicle_document_files_insert_admin" ON public.vehicle_document_files;
CREATE POLICY "vehicle_document_files_insert_admin"
  ON public.vehicle_document_files
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicle_document_files_delete_admin" ON public.vehicle_document_files;
CREATE POLICY "vehicle_document_files_delete_admin"
  ON public.vehicle_document_files
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- VEHICLE DRIVER HISTORY
-- ============================================================
ALTER TABLE public.vehicle_driver_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_driver_history_select" ON public.vehicle_driver_history;
CREATE POLICY "vehicle_driver_history_select"
  ON public.vehicle_driver_history
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "vehicle_driver_history_insert_admin" ON public.vehicle_driver_history;
CREATE POLICY "vehicle_driver_history_insert_admin"
  ON public.vehicle_driver_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicle_driver_history_update_admin" ON public.vehicle_driver_history;
CREATE POLICY "vehicle_driver_history_update_admin"
  ON public.vehicle_driver_history
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicle_driver_history_delete_admin" ON public.vehicle_driver_history;
CREATE POLICY "vehicle_driver_history_delete_admin"
  ON public.vehicle_driver_history
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- MAINTENANCE RULES
-- ============================================================
ALTER TABLE public.maintenance_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_rules_select" ON public.maintenance_rules;
CREATE POLICY "maintenance_rules_select"
  ON public.maintenance_rules
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "maintenance_rules_insert_admin" ON public.maintenance_rules;
CREATE POLICY "maintenance_rules_insert_admin"
  ON public.maintenance_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "maintenance_rules_update_admin" ON public.maintenance_rules;
CREATE POLICY "maintenance_rules_update_admin"
  ON public.maintenance_rules
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "maintenance_rules_delete_admin" ON public.maintenance_rules;
CREATE POLICY "maintenance_rules_delete_admin"
  ON public.maintenance_rules
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- MAINTENANCE EVENTS
-- ============================================================
ALTER TABLE public.maintenance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_events_select" ON public.maintenance_events;
CREATE POLICY "maintenance_events_select"
  ON public.maintenance_events
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "maintenance_events_select_deleted_admin" ON public.maintenance_events;
CREATE POLICY "maintenance_events_select_deleted_admin"
  ON public.maintenance_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "maintenance_events_insert_admin" ON public.maintenance_events;
CREATE POLICY "maintenance_events_insert_admin"
  ON public.maintenance_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "maintenance_events_update_admin" ON public.maintenance_events;
CREATE POLICY "maintenance_events_update_admin"
  ON public.maintenance_events
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "maintenance_events_delete_admin" ON public.maintenance_events;
CREATE POLICY "maintenance_events_delete_admin"
  ON public.maintenance_events
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- MILEAGE LOGS
-- ============================================================
ALTER TABLE public.mileage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mileage_logs_select" ON public.mileage_logs;
CREATE POLICY "mileage_logs_select"
  ON public.mileage_logs
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "mileage_logs_insert_admin" ON public.mileage_logs;
CREATE POLICY "mileage_logs_insert_admin"
  ON public.mileage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mileage_logs_update_admin" ON public.mileage_logs;
CREATE POLICY "mileage_logs_update_admin"
  ON public.mileage_logs
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mileage_logs_delete_admin" ON public.mileage_logs;
CREATE POLICY "mileage_logs_delete_admin"
  ON public.mileage_logs
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- ALERTS
-- ============================================================
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select" ON public.alerts;
CREATE POLICY "alerts_select"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "alerts_insert_admin" ON public.alerts;
CREATE POLICY "alerts_insert_admin"
  ON public.alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "alerts_update_admin" ON public.alerts;
CREATE POLICY "alerts_update_admin"
  ON public.alerts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "alerts_delete_admin" ON public.alerts;
CREATE POLICY "alerts_delete_admin"
  ON public.alerts
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

