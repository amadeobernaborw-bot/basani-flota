import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateConsolidatedPdf,
  type ConsolidatedEntityType,
} from '@/lib/pdf/consolidated'

function isEntityType(value: string): value is ConsolidatedEntityType {
  return value === 'employee' || value === 'vehicle'
}

interface RouteParams {
  params: Promise<{ entityType: string; entityId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { entityType, entityId } = await params

  if (!isEntityType(entityType)) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }
  if (!entityId) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { pdfBytes, filename, error } = await generateConsolidatedPdf(
    entityType,
    entityId
  )

  if (error || !pdfBytes || !filename) {
    return NextResponse.json(
      { error: error ?? 'Error al generar PDF' },
      { status: 500 }
    )
  }

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
