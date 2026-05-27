-- ============================================================
-- Migration: add `orden` column to document_types
-- Adds a global ordering column so admins can rank document
-- types from the settings panel. Lower numbers appear first
-- in entity document lists and in the consolidated PDF.
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_document_types_orden ON public.document_types(orden);

-- Backfill: assign incremental positions (multiples of 10) for any
-- rows still on the default, ordered by current alphabetical scheme.
-- The step of 10 leaves room for manual insertions later.
WITH ranked AS (
  SELECT id,
         (ROW_NUMBER() OVER (ORDER BY aplica_a, nombre))::INTEGER * 10 AS rank
  FROM public.document_types
  WHERE orden = 999
)
UPDATE public.document_types t
SET    orden = r.rank
FROM   ranked r
WHERE  t.id = r.id;
