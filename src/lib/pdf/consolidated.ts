import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'
import type {
  EmployeeDocument,
  VehicleDocument,
  EmployeeDocumentFile,
  VehicleDocumentFile,
  Employee,
  Vehicle,
  EmployeeCategory,
  VehicleCategory,
} from '@/types/database'

export type ConsolidatedEntityType = 'employee' | 'vehicle'

interface ConsolidatedResult {
  pdfBytes: Uint8Array | null
  filename: string | null
  error?: string
}

const PAGE_WIDTH = 595.28 // A4 width in points
const PAGE_HEIGHT = 841.89 // A4 height in points
const MARGIN = 50

const EMPLOYEE_CATEGORY_LABELS: Record<EmployeeCategory, string> = {
  operario: 'OPERARIO',
  camionero: 'CAMIONERO',
  administrativo: 'ADMINISTRATIVO',
}

const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  auto: 'AUTO',
  camioneta: 'CAMIONETA',
  camion: 'CAMION',
}

function sanitizeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface DocumentRow {
  document:
    | (EmployeeDocument & { document_type?: { nombre?: string } })
    | (VehicleDocument & { document_type?: { nombre?: string } })
  files: Array<EmployeeDocumentFile | VehicleDocumentFile>
}

async function fetchEntityAndDocuments(
  entityType: ConsolidatedEntityType,
  entityId: string
): Promise<{
  entity: Employee | Vehicle | null
  documents: DocumentRow[]
  error?: string
}> {
  const supabase = await createClient()

  if (entityType === 'employee') {
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', entityId)
      .is('deleted_at', null)
      .single<Employee>()
    if (empError || !employee) {
      return { entity: null, documents: [], error: 'Empleado no encontrado.' }
    }

    const { data: docs } = await supabase
      .from('employee_documents')
      .select('*, document_type:document_types(nombre)')
      .eq('employee_id', entityId)
      .eq('is_current', true)
      .is('deleted_at', null)
      .order('document_type(nombre)', { ascending: true })

    const documentRows: DocumentRow[] = []
    for (const doc of (docs ?? []) as EmployeeDocument[]) {
      const { data: files } = await supabase
        .from('employee_document_files')
        .select('*')
        .eq('document_id', doc.id)
      documentRows.push({
        document: doc,
        files: (files as EmployeeDocumentFile[]) ?? [],
      })
    }
    return { entity: employee, documents: documentRows }
  }

  const { data: vehicle, error: vehError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', entityId)
    .is('deleted_at', null)
    .single<Vehicle>()
  if (vehError || !vehicle) {
    return { entity: null, documents: [], error: 'Vehículo no encontrado.' }
  }

  const { data: docs } = await supabase
    .from('vehicle_documents')
    .select('*, document_type:document_types(nombre)')
    .eq('vehicle_id', entityId)
    .eq('is_current', true)
    .is('deleted_at', null)
    .order('document_type(nombre)', { ascending: true })

  const documentRows: DocumentRow[] = []
  for (const doc of (docs ?? []) as VehicleDocument[]) {
    const { data: files } = await supabase
      .from('vehicle_document_files')
      .select('*')
      .eq('document_id', doc.id)
    documentRows.push({
      document: doc,
      files: (files as VehicleDocumentFile[]) ?? [],
    })
  }
  return { entity: vehicle, documents: documentRows }
}

async function downloadStorageFile(path: string): Promise<Uint8Array | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('documents')
      .download(path)
    if (error || !data) return null
    const buffer = await data.arrayBuffer()
    return new Uint8Array(buffer)
  } catch {
    return null
  }
}

function drawText(
  page: import('pdf-lib').PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb> = rgb(0.1, 0.1, 0.1)
) {
  page.drawText(text, { x, y, size, font, color })
}

function buildEntityTitle(entity: Employee | Vehicle, entityType: ConsolidatedEntityType): string {
  if (entityType === 'employee') {
    const emp = entity as Employee
    const cat = EMPLOYEE_CATEGORY_LABELS[emp.categoria]
    return `${emp.nombre.toUpperCase()} ${emp.apellido.toUpperCase()} - DNI ${emp.dni} - ${cat}`
  }
  const veh = entity as Vehicle
  const cat = VEHICLE_CATEGORY_LABELS[veh.categoria]
  return `${veh.marca.toUpperCase()} ${veh.modelo.toUpperCase()} - ${veh.patente} - ${cat}`
}

function drawCover(
  doc: PDFDocument,
  entity: Employee | Vehicle,
  entityType: ConsolidatedEntityType,
  documentCount: number,
  bold: PDFFont,
  regular: PDFFont
) {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const now = new Date()

  // Header strip
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 80,
    width: PAGE_WIDTH,
    height: 80,
    color: rgb(0.1, 0.1, 0.12),
  })
  drawText(page, 'BASANI', MARGIN, PAGE_HEIGHT - 40, bold, 22, rgb(1, 1, 1))
  drawText(
    page,
    'Documentación consolidada',
    MARGIN,
    PAGE_HEIGHT - 62,
    regular,
    11,
    rgb(0.85, 0.85, 0.9)
  )

  // Title
  let y = PAGE_HEIGHT - 180
  const title = buildEntityTitle(entity, entityType)
  drawText(page, title, MARGIN, y, bold, 16)

  // Status badge
  y -= 30
  const estado = (entity as Employee | Vehicle).estado.toUpperCase()
  drawText(page, `Estado: ${estado}`, MARGIN, y, regular, 11, rgb(0.4, 0.4, 0.4))

  // Detail block
  y -= 40
  drawText(page, 'Información', MARGIN, y, bold, 12)
  y -= 18
  if (entityType === 'employee') {
    const emp = entity as Employee
    drawText(page, `DNI: ${emp.dni}`, MARGIN, y, regular, 11)
    y -= 14
    if (emp.cuil) {
      drawText(page, `CUIL: ${emp.cuil}`, MARGIN, y, regular, 11)
      y -= 14
    }
    drawText(page, `Ingreso: ${formatDate(emp.fecha_ingreso)}`, MARGIN, y, regular, 11)
    y -= 14
    if (emp.email) {
      drawText(page, `Email: ${emp.email}`, MARGIN, y, regular, 11)
      y -= 14
    }
  } else {
    const veh = entity as Vehicle
    drawText(page, `Patente: ${veh.patente}`, MARGIN, y, regular, 11)
    y -= 14
    drawText(page, `Año: ${veh.anio}`, MARGIN, y, regular, 11)
    y -= 14
    if (veh.chasis) {
      drawText(page, `Chasis: ${veh.chasis}`, MARGIN, y, regular, 11)
      y -= 14
    }
    if (veh.motor) {
      drawText(page, `Motor: ${veh.motor}`, MARGIN, y, regular, 11)
      y -= 14
    }
  }

  // Footer
  drawText(
    page,
    `Documentos incluidos: ${documentCount}`,
    MARGIN,
    100,
    regular,
    10,
    rgb(0.3, 0.3, 0.3)
  )
  drawText(
    page,
    `Generado: ${now.toLocaleString('es-AR')}`,
    MARGIN,
    84,
    regular,
    10,
    rgb(0.3, 0.3, 0.3)
  )
  drawText(
    page,
    'Solo se incluyen documentos vigentes y archivos adjuntos disponibles.',
    MARGIN,
    68,
    regular,
    9,
    rgb(0.5, 0.5, 0.5)
  )
}

function drawIndex(
  doc: PDFDocument,
  documents: DocumentRow[],
  bold: PDFFont,
  regular: PDFFont
) {
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawText(page, 'Índice de documentos', MARGIN, PAGE_HEIGHT - MARGIN, bold, 16)
  let y = PAGE_HEIGHT - MARGIN - 32

  if (documents.length === 0) {
    drawText(
      page,
      'No hay documentos vigentes para incluir.',
      MARGIN,
      y,
      regular,
      11,
      rgb(0.4, 0.4, 0.4)
    )
    return
  }

  documents.forEach((row, index) => {
    if (y < MARGIN + 30) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN
    }
    const typeName = row.document.document_type?.nombre ?? 'Documento'
    const venc = row.document.sin_vencimiento
      ? 'Sin vencimiento'
      : `Vence: ${formatDate(row.document.fecha_vencimiento)}`
    const fileCount = row.files.length
    drawText(
      page,
      `${(index + 1).toString().padStart(2, '0')}. ${typeName}`,
      MARGIN,
      y,
      bold,
      11
    )
    y -= 14
    drawText(
      page,
      `${venc} · ${fileCount} archivo${fileCount === 1 ? '' : 's'}`,
      MARGIN + 16,
      y,
      regular,
      10,
      rgb(0.4, 0.4, 0.4)
    )
    y -= 22
  })
}

async function embedFiles(
  doc: PDFDocument,
  row: DocumentRow,
  bold: PDFFont,
  regular: PDFFont
) {
  // Section separator page
  const separator = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const typeName = row.document.document_type?.nombre ?? 'Documento'
  separator.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 60,
    width: PAGE_WIDTH,
    height: 60,
    color: rgb(0.95, 0.95, 0.97),
  })
  drawText(separator, typeName, MARGIN, PAGE_HEIGHT - 38, bold, 18)
  const subtitle = row.document.sin_vencimiento
    ? 'Sin vencimiento'
    : `Vencimiento: ${formatDate(row.document.fecha_vencimiento)}`
  drawText(separator, subtitle, MARGIN, PAGE_HEIGHT - 90, regular, 11, rgb(0.3, 0.3, 0.3))
  if (row.document.numero) {
    drawText(
      separator,
      `Número: ${row.document.numero}`,
      MARGIN,
      PAGE_HEIGHT - 108,
      regular,
      11,
      rgb(0.3, 0.3, 0.3)
    )
  }
  if (row.files.length === 0) {
    drawText(
      separator,
      'Sin archivos adjuntos para este documento.',
      MARGIN,
      PAGE_HEIGHT - 150,
      regular,
      11,
      rgb(0.5, 0.5, 0.5)
    )
    return
  }

  for (const file of row.files) {
    const bytes = await downloadStorageFile(file.storage_path)
    if (!bytes) continue

    if (file.file_type === 'application/pdf') {
      try {
        const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const pages = await doc.copyPages(sourcePdf, sourcePdf.getPageIndices())
        pages.forEach((p) => doc.addPage(p))
      } catch {
        // Skip unsupported/corrupt PDFs silently
      }
      continue
    }

    if (file.file_type === 'image/jpeg' || file.file_type === 'image/png') {
      try {
        const image =
          file.file_type === 'image/jpeg'
            ? await doc.embedJpg(bytes)
            : await doc.embedPng(bytes)
        const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        const maxW = PAGE_WIDTH - MARGIN * 2
        const maxH = PAGE_HEIGHT - MARGIN * 2 - 30
        const scale = Math.min(maxW / image.width, maxH / image.height, 1)
        const w = image.width * scale
        const h = image.height * scale
        const x = (PAGE_WIDTH - w) / 2
        const yPos = (PAGE_HEIGHT - h) / 2
        page.drawImage(image, { x, y: yPos, width: w, height: h })
        drawText(page, file.file_name, MARGIN, MARGIN, regular, 9, rgb(0.5, 0.5, 0.5))
      } catch {
        // Skip if image fails to embed
      }
    }
  }
}

export async function generateConsolidatedPdf(
  entityType: ConsolidatedEntityType,
  entityId: string
): Promise<ConsolidatedResult> {
  const { entity, documents, error } = await fetchEntityAndDocuments(entityType, entityId)
  if (error || !entity) {
    return { pdfBytes: null, filename: null, error: error ?? 'No encontrado' }
  }

  try {
    const doc = await PDFDocument.create()
    doc.setTitle(buildEntityTitle(entity, entityType))
    doc.setProducer('Basani Fleet Management')
    doc.setCreator('Basani')

    const regular = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)

    drawCover(doc, entity, entityType, documents.length, bold, regular)
    drawIndex(doc, documents, bold, regular)

    for (const row of documents) {
      await embedFiles(doc, row, bold, regular)
    }

    const pdfBytes = await doc.save()

    const baseName =
      entityType === 'employee'
        ? `${(entity as Employee).apellido}_${(entity as Employee).nombre}_${(entity as Employee).dni}`
        : `${(entity as Vehicle).patente}_${(entity as Vehicle).marca}_${(entity as Vehicle).modelo}`
    const filename = `Basani_${sanitizeFilename(baseName)}.pdf`

    return { pdfBytes, filename }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al generar PDF'
    return { pdfBytes: null, filename: null, error: message }
  }
}
