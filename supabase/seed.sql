-- ============================================================
-- Basani — Seed Data
-- Run AFTER schema.sql and rls.sql
-- ============================================================

-- ============================================================
-- DOCUMENT TYPES — Employees
-- ============================================================
INSERT INTO public.document_types (nombre, aplica_a, requiere_vencimiento, is_active) VALUES
  ('DNI',                     'employee', FALSE, TRUE),
  ('CUIL / CUIT',             'employee', FALSE, TRUE),
  ('Carnet de conducir',      'employee', TRUE,  TRUE),
  ('Licencia profesional',    'employee', TRUE,  TRUE),
  ('Habilitación autoelevador','employee', TRUE,  TRUE),
  ('Habilitación hidrogrúa',  'employee', TRUE,  TRUE),
  ('ART',                     'employee', TRUE,  TRUE),
  ('Examen médico preocupacional', 'employee', TRUE, TRUE),
  ('Examen médico periódico', 'employee', TRUE,  TRUE),
  ('Certificado de capacitación', 'employee', TRUE, TRUE),
  ('Certificado de seguridad','employee', TRUE,  TRUE),
  ('Contrato laboral',        'employee', FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DOCUMENT TYPES — Vehicles
-- ============================================================
INSERT INTO public.document_types (nombre, aplica_a, requiere_vencimiento, is_active) VALUES
  ('Seguro de vehículo',      'vehicle',  TRUE,  TRUE),
  ('Título del vehículo',     'vehicle',  FALSE, TRUE),
  ('Cédula verde',            'vehicle',  FALSE, TRUE),
  ('Cédula azul',             'vehicle',  FALSE, TRUE),
  ('VTV (Verificación técnica)', 'vehicle', TRUE, TRUE),
  ('Habilitación municipal',  'vehicle',  TRUE,  TRUE),
  ('Habilitación provincial', 'vehicle',  TRUE,  TRUE),
  ('Certificado de habilitación de transporte', 'vehicle', TRUE, TRUE),
  ('Ruta (permiso de circulación)', 'vehicle', TRUE, TRUE),
  ('Revisión de frenos',      'vehicle',  TRUE,  TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Set admin role for the initial admin user
-- (Run after creating the user in Supabase Auth dashboard)
-- Replace the email below if needed.
-- ============================================================
-- UPDATE public.profiles
--   SET role = 'admin'
-- WHERE email = 'operacionesneuquen@basani.com.ar';
