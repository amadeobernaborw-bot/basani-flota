-- ============================================================
-- Basani — Sistema de Gestión de Flota y Documentación
-- Schema PostgreSQL para Supabase
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- Linked to auth.users — stores role and display email
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('admin', 'reader')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'reader')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- DOCUMENT TYPES
-- Configurable from admin panel. Applies to employees, vehicles, or both.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_types (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre               TEXT NOT NULL,
  aplica_a             TEXT NOT NULL CHECK (aplica_a IN ('employee', 'vehicle', 'both')),
  requiere_vencimiento BOOLEAN NOT NULL DEFAULT TRUE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  orden                INTEGER NOT NULL DEFAULT 999,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_document_types_aplica_a ON public.document_types(aplica_a);
CREATE INDEX IF NOT EXISTS idx_document_types_is_active ON public.document_types(is_active);
CREATE INDEX IF NOT EXISTS idx_document_types_orden ON public.document_types(orden);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre               TEXT NOT NULL,
  apellido             TEXT NOT NULL,
  dni                  TEXT NOT NULL UNIQUE,
  cuil                 TEXT,
  fecha_nacimiento     DATE,
  direccion            TEXT,
  telefono             TEXT,
  email                TEXT,
  contacto_emergencia  TEXT,
  categoria            TEXT NOT NULL CHECK (categoria IN ('operario', 'camionero', 'administrativo')),
  fecha_ingreso        DATE NOT NULL,
  fecha_egreso         DATE,
  estado               TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'baja')),
  observaciones        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_employees_dni ON public.employees(dni);
CREATE INDEX IF NOT EXISTS idx_employees_estado ON public.employees(estado);
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON public.employees(deleted_at);
CREATE INDEX IF NOT EXISTS idx_employees_categoria ON public.employees(categoria);

-- ============================================================
-- EMPLOYEE DOCUMENTS
-- Versioned documents per employee. is_current = TRUE means active version.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id       UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type_id           UUID NOT NULL REFERENCES public.document_types(id),
  numero            TEXT,
  fecha_emision     DATE,
  fecha_vencimiento DATE,
  sin_vencimiento   BOOLEAN NOT NULL DEFAULT FALSE,
  estado            TEXT NOT NULL DEFAULT 'vigente',
  observaciones     TEXT,
  comentarios       TEXT,
  version           INTEGER NOT NULL DEFAULT 1,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON public.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_type_id ON public.employee_documents(type_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_fecha_vencimiento ON public.employee_documents(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_employee_documents_is_current ON public.employee_documents(is_current);
CREATE INDEX IF NOT EXISTS idx_employee_documents_deleted_at ON public.employee_documents(deleted_at);

-- ============================================================
-- EMPLOYEE DOCUMENT FILES
-- Storage references for each document (supports multiple files)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_document_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id   UUID NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_document_files_document_id ON public.employee_document_files(document_id);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca         TEXT NOT NULL,
  modelo        TEXT NOT NULL,
  anio          SMALLINT NOT NULL,
  patente       TEXT NOT NULL UNIQUE,
  chasis        TEXT,
  motor         TEXT,
  categoria     TEXT NOT NULL CHECK (categoria IN ('auto', 'camioneta', 'camion')),
  estado        TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'fuera_de_servicio', 'baja')),
  observaciones TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vehicles_patente ON public.vehicles(patente);
CREATE INDEX IF NOT EXISTS idx_vehicles_estado ON public.vehicles(estado);
CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at ON public.vehicles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_categoria ON public.vehicles(categoria);

-- ============================================================
-- VEHICLE DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id        UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type_id           UUID NOT NULL REFERENCES public.document_types(id),
  numero            TEXT,
  fecha_emision     DATE,
  fecha_vencimiento DATE,
  sin_vencimiento   BOOLEAN NOT NULL DEFAULT FALSE,
  estado            TEXT NOT NULL DEFAULT 'vigente',
  observaciones     TEXT,
  comentarios       TEXT,
  version           INTEGER NOT NULL DEFAULT 1,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_type_id ON public.vehicle_documents(type_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_fecha_vencimiento ON public.vehicle_documents(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_is_current ON public.vehicle_documents(is_current);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_deleted_at ON public.vehicle_documents(deleted_at);

-- ============================================================
-- VEHICLE DOCUMENT FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_document_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id   UUID NOT NULL REFERENCES public.vehicle_documents(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_document_files_document_id ON public.vehicle_document_files(document_id);

-- ============================================================
-- VEHICLE DRIVER HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_driver_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id    UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE,
  observaciones TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_driver_history_vehicle_id ON public.vehicle_driver_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_driver_history_employee_id ON public.vehicle_driver_history(employee_id);

-- ============================================================
-- MAINTENANCE RULES
-- Global rules by vehicle category or individual per vehicle
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_rules (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria          TEXT CHECK (categoria IN ('auto', 'camioneta', 'camion')),
  tipo_mantenimiento TEXT NOT NULL,
  descripcion        TEXT NOT NULL,
  km_intervalo       INTEGER,
  dias_intervalo     INTEGER,
  is_global          BOOLEAN NOT NULL DEFAULT TRUE,
  vehicle_id         UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A rule is either global (category-based) or individual (vehicle-based)
  CONSTRAINT chk_rule_scope CHECK (
    (is_global = TRUE AND vehicle_id IS NULL) OR
    (is_global = FALSE AND vehicle_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_maintenance_rules_categoria ON public.maintenance_rules(categoria);
CREATE INDEX IF NOT EXISTS idx_maintenance_rules_vehicle_id ON public.maintenance_rules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_rules_is_active ON public.maintenance_rules(is_active);

-- ============================================================
-- MAINTENANCE EVENTS
-- Records of maintenance performed or pending
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_events (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id         UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  rule_id            UUID REFERENCES public.maintenance_rules(id) ON DELETE SET NULL,
  tipo               TEXT NOT NULL CHECK (tipo IN ('preventivo', 'correctivo')),
  descripcion        TEXT NOT NULL,
  fecha              DATE NOT NULL,
  kilometraje        INTEGER,
  proximo_kilometraje INTEGER,
  proxima_revision   DATE,
  observaciones      TEXT,
  estado             TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'vencido')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_maintenance_events_vehicle_id ON public.maintenance_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_events_estado ON public.maintenance_events(estado);
CREATE INDEX IF NOT EXISTS idx_maintenance_events_fecha ON public.maintenance_events(fecha);
CREATE INDEX IF NOT EXISTS idx_maintenance_events_proxima_revision ON public.maintenance_events(proxima_revision);
CREATE INDEX IF NOT EXISTS idx_maintenance_events_deleted_at ON public.maintenance_events(deleted_at);

-- ============================================================
-- MILEAGE LOGS
-- Monthly mileage records per vehicle
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mileage_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id     UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  kilometraje    INTEGER NOT NULL,
  fecha_registro DATE NOT NULL,
  mes            SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio           SMALLINT NOT NULL,
  fuente         TEXT NOT NULL DEFAULT 'manual' CHECK (fuente IN ('manual', 'email')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One record per vehicle per month
  UNIQUE (vehicle_id, mes, anio)
);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_vehicle_id ON public.mileage_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_anio_mes ON public.mileage_logs(anio, mes);

-- ============================================================
-- ALERTS
-- Centralized alert system for expirations, maintenance, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo         TEXT NOT NULL CHECK (tipo IN (
    'vencimiento_documento',
    'mantenimiento_pendiente',
    'revision_pendiente',
    'error_kilometraje'
  )),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('employee', 'vehicle', 'maintenance', 'mileage')),
  entity_id    UUID NOT NULL,
  titulo       TEXT NOT NULL,
  descripcion  TEXT NOT NULL,
  estado       TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada')),
  due_date     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_estado ON public.alerts(estado);
CREATE INDEX IF NOT EXISTS idx_alerts_tipo ON public.alerts(tipo);
CREATE INDEX IF NOT EXISTS idx_alerts_entity_id ON public.alerts(entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_due_date ON public.alerts(due_date);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop + create makes this section safe to re-run.
DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_employee_documents_updated_at ON public.employee_documents;
CREATE TRIGGER trg_employee_documents_updated_at
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicle_documents_updated_at ON public.vehicle_documents;
CREATE TRIGGER trg_vehicle_documents_updated_at
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_maintenance_events_updated_at ON public.maintenance_events;
CREATE TRIGGER trg_maintenance_events_updated_at
  BEFORE UPDATE ON public.maintenance_events
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
