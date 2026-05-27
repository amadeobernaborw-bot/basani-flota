import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { getDocumentStatus, type StatusColor } from '@/lib/utils/status'
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

// ─── Page geometry ────────────────────────────────────────────────────────────
const PAGE_W = 595.28
const PAGE_H = 841.89
const SIDE = 39 // 6.5% of width
const HEADER_H = 67 // 8% of height (cover)
const RUN_HEADER_H = 36 // running header on document pages

// ─── Brand palette (mirrors the design tokens) ───────────────────────────────
const ACCENT = rgb(0.769, 0.278, 0.129) // Basani #c44721
const ACCENT_BG = rgb(0.988, 0.964, 0.957) // accent at ~5% over white
const ACCENT_BG_STRONG = rgb(0.984, 0.949, 0.939) // accent at ~7%
const ACCENT_BORDER = rgb(0.958, 0.870, 0.844) // accent at ~18%
const DARK = rgb(0.094, 0.094, 0.094)
const TEXT = rgb(0.102, 0.102, 0.102)
const MUTED = rgb(0.376, 0.376, 0.376)
const FAINT = rgb(0.565, 0.565, 0.565)
const BORDER = rgb(0.898, 0.898, 0.898)
const BORDER_LIGHT = rgb(0.941, 0.941, 0.941)
const LIGHT = rgb(0.976, 0.976, 0.976)
const LIGHTER = rgb(0.988, 0.988, 0.988)
const WHITE = rgb(1, 1, 1)
const WHITE_40 = rgb(0.4, 0.4, 0.4) // not used; we use opacity instead

const STATUS = {
  green: {
    bg: rgb(0.863, 0.988, 0.906),
    text: rgb(0.082, 0.502, 0.239),
    dot: rgb(0.133, 0.773, 0.369),
    label: 'Vigente',
  },
  yellow: {
    bg: rgb(0.996, 0.976, 0.765),
    text: rgb(0.573, 0.251, 0.055),
    dot: rgb(0.851, 0.467, 0.024),
    label: 'Por vencer',
  },
  red: {
    bg: rgb(0.996, 0.886, 0.886),
    text: rgb(0.6, 0.106, 0.106),
    dot: rgb(0.863, 0.149, 0.149),
    label: 'Vencido',
  },
  blue: {
    bg: rgb(0.859, 0.918, 0.996),
    text: rgb(0.118, 0.251, 0.686),
    dot: rgb(0.231, 0.51, 0.965),
    label: 'Sin venc.',
  },
  gray: {
    bg: rgb(0.953, 0.957, 0.965),
    text: rgb(0.294, 0.337, 0.388),
    dot: rgb(0.612, 0.639, 0.686),
    label: 'Sin fecha',
  },
} as const

const EMPLOYEE_CATEGORY_LABELS: Record<EmployeeCategory, string> = {
  operario: 'Operario',
  camionero: 'Camionero',
  administrativo: 'Administrativo',
}

const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  auto: 'Auto',
  camioneta: 'Camioneta',
  camion: 'Camión',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function todayStr(): string {
  return new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = TEXT
) {
  page.drawText(text, { x, y, size, font, color })
}

function drawTextRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = TEXT
) {
  const w = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: rightX - w, y, size, font, color })
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  const ellipsis = '…'
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = ((lo + hi) >> 1) + 1
    const slice = text.slice(0, mid) + ellipsis
    if (font.widthOfTextAtSize(slice, size) <= maxWidth) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return text.slice(0, lo) + ellipsis
}

function drawDot(page: PDFPage, cx: number, cy: number, r: number, color: ReturnType<typeof rgb>) {
  page.drawCircle({ x: cx, y: cy, size: r, color })
}

interface BadgeOpts {
  page: PDFPage
  text: string
  x: number
  y: number // baseline-ish (top of badge)
  status: StatusColor
  bold: PDFFont
}

function drawBadge({ page, text, x, y, status, bold }: BadgeOpts): { width: number; height: number } {
  const s = STATUS[status]
  const fontSize = 7
  const dotR = 1.6
  const padX = 5
  const padY = 3
  const dotGap = 4
  const textW = bold.widthOfTextAtSize(text, fontSize)
  const inner = dotR * 2 + dotGap + textW
  const width = inner + padX * 2
  const height = fontSize + padY * 2

  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: s.bg,
    borderColor: s.bg,
  })
  drawDot(page, x + padX + dotR, y - height / 2, dotR, s.dot)
  page.drawText(text, {
    x: x + padX + dotR * 2 + dotGap,
    y: y - height + padY + 1,
    size: fontSize,
    font: bold,
    color: s.text,
  })
  return { width, height }
}

// ─── Data fetching ────────────────────────────────────────────────────────────

interface DocumentRow {
  document:
    | (EmployeeDocument & { document_type?: { nombre?: string; orden?: number } })
    | (VehicleDocument & { document_type?: { nombre?: string; orden?: number } })
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
      .select('*, document_type:document_types(nombre, orden)')
      .eq('employee_id', entityId)
      .eq('is_current', true)
      .is('deleted_at', null)
      .order('document_type(orden)', { ascending: true })
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
    .select('*, document_type:document_types(nombre, orden)')
    .eq('vehicle_id', entityId)
    .eq('is_current', true)
    .is('deleted_at', null)
    .order('document_type(orden)', { ascending: true })
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
    const { data, error } = await supabase.storage.from('documents').download(path)
    if (error || !data) return null
    const buffer = await data.arrayBuffer()
    return new Uint8Array(buffer)
  } catch {
    return null
  }
}

// ─── Document status helpers ─────────────────────────────────────────────────

function statusOf(d: DocumentRow['document']): StatusColor {
  return getDocumentStatus(d.fecha_vencimiento, d.sin_vencimiento)
}

function buildEntityDisplayName(
  entity: Employee | Vehicle,
  entityType: ConsolidatedEntityType
): string {
  if (entityType === 'employee') {
    const e = entity as Employee
    return `${e.apellido.toUpperCase()}, ${e.nombre}`
  }
  const v = entity as Vehicle
  return `${v.marca.toUpperCase()} ${v.modelo.toUpperCase()}`
}

function buildEntityCategory(
  entity: Employee | Vehicle,
  entityType: ConsolidatedEntityType
): string {
  return entityType === 'employee'
    ? EMPLOYEE_CATEGORY_LABELS[(entity as Employee).categoria]
    : VEHICLE_CATEGORY_LABELS[(entity as Vehicle).categoria]
}

function shortEntityId(id: string, prefix: string): string {
  return `${prefix}-${id.slice(0, 8).toUpperCase()}`
}

// ─── Logo embed cache ─────────────────────────────────────────────────────────

interface LogoAssets {
  bytes: Uint8Array | null
}

async function loadLogo(): Promise<LogoAssets> {
  try {
    const logoPath = join(process.cwd(), 'public', 'logo.png')
    const bytes = await readFile(logoPath)
    return { bytes: new Uint8Array(bytes) }
  } catch {
    return { bytes: null }
  }
}

// ─── Cover + Index page ──────────────────────────────────────────────────────

interface CoverIndexCtx {
  doc: PDFDocument
  entity: Employee | Vehicle
  entityType: ConsolidatedEntityType
  documents: DocumentRow[]
  bold: PDFFont
  regular: PDFFont
  logo: LogoAssets
  pageNum: number
  totalPages: number
}

async function drawCoverIndex(ctx: CoverIndexCtx): Promise<void> {
  const { doc, entity, entityType, documents, bold, regular, logo, pageNum, totalPages } = ctx
  const page = doc.addPage([PAGE_W, PAGE_H])
  const today = todayStr()
  const isEmp = entityType === 'employee'

  // ── Dark header band ──
  page.drawRectangle({
    x: 0,
    y: PAGE_H - HEADER_H,
    width: PAGE_W,
    height: HEADER_H,
    color: DARK,
  })

  // Logo (white) — embed inverted by drawing on dark bg
  if (logo.bytes) {
    try {
      const img = await doc.embedPng(logo.bytes)
      const logoH = HEADER_H * 0.5
      const logoW = (img.width / img.height) * logoH
      // pdf-lib doesn't invert PNG alpha; the logo PNG is already provided.
      // For a white-on-dark look the asset should be the white variant,
      // but we approximate with a slight white overlay if needed.
      page.drawImage(img, {
        x: SIDE,
        y: PAGE_H - HEADER_H / 2 - logoH / 2,
        width: logoW,
        height: logoH,
        opacity: 0.95,
      })
    } catch {
      drawText(page, 'BASANI', SIDE, PAGE_H - HEADER_H / 2 - 6, bold, 18, WHITE)
    }
  } else {
    drawText(page, 'BASANI', SIDE, PAGE_H - HEADER_H / 2 - 6, bold, 18, WHITE)
  }

  // Header right column
  drawTextRight(
    page,
    'DOCUMENTACIÓN CONSOLIDADA',
    PAGE_W - SIDE,
    PAGE_H - HEADER_H / 2 + 2,
    bold,
    7.5,
    rgb(0.65, 0.65, 0.7)
  )
  drawTextRight(
    page,
    today,
    PAGE_W - SIDE,
    PAGE_H - HEADER_H / 2 - 11,
    regular,
    8,
    rgb(0.8, 0.8, 0.82)
  )

  // ── Footer (accent strip) ── drawn first so we know its top edge
  const footerH = 24
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: footerH,
    color: ACCENT_BG,
  })
  page.drawRectangle({
    x: 0,
    y: footerH,
    width: PAGE_W,
    height: 2,
    color: ACCENT,
  })
  drawText(
    page,
    'Solo se incluyen documentos vigentes y versiones actuales',
    SIDE,
    footerH / 2 - 3,
    regular,
    7.5,
    MUTED
  )
  drawTextRight(
    page,
    `Generado: ${today} · Pág. ${pageNum} / ${totalPages}`,
    PAGE_W - SIDE,
    footerH / 2 - 3,
    regular,
    7.5,
    MUTED
  )

  // ── Body cursor ──
  let y = PAGE_H - HEADER_H - 28

  // Entity block with accent left border
  const entityBlockH = 56
  page.drawRectangle({
    x: SIDE,
    y: y - entityBlockH,
    width: 3,
    height: entityBlockH,
    color: ACCENT,
  })
  const lblX = SIDE + 14
  const idLabel = `${isEmp ? 'Expediente de Empleado' : 'Expediente de Vehículo'}  ·  ${shortEntityId(entity.id, isEmp ? 'EMP' : 'VEH')}`
  drawText(page, idLabel.toUpperCase(), lblX, y - 9, regular, 7.5, FAINT)

  const displayName = truncate(
    buildEntityDisplayName(entity, entityType),
    bold,
    17,
    PAGE_W - SIDE - lblX - 10
  )
  drawText(page, displayName, lblX, y - 28, bold, 17, TEXT)

  // Sub-row: DNI/Patente · categoría · status badge · alert
  const subY = y - 47
  const subLeft =
    isEmp
      ? `DNI ${(entity as Employee).dni}`
      : `Patente ${(entity as Vehicle).patente}`
  drawText(page, subLeft, lblX, subY, regular, 9.5, MUTED)
  const sep1X = lblX + regular.widthOfTextAtSize(subLeft, 9.5) + 6
  drawText(page, '·', sep1X, subY, regular, 9.5, BORDER)
  const cat = buildEntityCategory(entity, entityType).toUpperCase()
  drawText(page, cat, sep1X + 8, subY, regular, 8.5, MUTED)
  const badgeX = sep1X + 8 + regular.widthOfTextAtSize(cat, 8.5) + 10

  // status badge based on entity.estado — always 'green' tinted (active)
  drawBadge({
    page,
    text: 'Vigente',
    x: badgeX,
    y: subY + 9,
    status: 'green',
    bold,
  })

  // Document status counts
  const cnt: Record<StatusColor, number> = { green: 0, yellow: 0, red: 0, blue: 0, gray: 0 }
  for (const row of documents) {
    cnt[statusOf(row.document)]++
  }

  // Inline expired-warning chip
  if (cnt.red > 0) {
    const chipText = `⚠ ${cnt.red} vencido${cnt.red === 1 ? '' : 's'}`
    const chipW = bold.widthOfTextAtSize(chipText, 8) + 12
    const chipX = badgeX + 78
    page.drawRectangle({
      x: chipX,
      y: subY - 1,
      width: chipW,
      height: 12,
      color: STATUS.red.bg,
    })
    drawText(page, chipText, chipX + 6, subY + 2, bold, 8, STATUS.red.text)
  }

  y -= entityBlockH + 18

  // ── Info + Stats row ──
  const rowTop = y
  const rowH = 70
  const colGap = 20
  const statsW = (PAGE_W - SIDE * 2) * 0.34
  const infoW = PAGE_W - SIDE * 2 - statsW - colGap

  // Left: 2x2 grid of key/value pairs (DNI already shown in sub-row above)
  const infoFields: Array<[string, string]> = isEmp
    ? [
        ['CUIL', (entity as Employee).cuil ?? '—'],
        ['INGRESO', formatDate((entity as Employee).fecha_ingreso)],
        ['TELÉFONO', (entity as Employee).telefono ?? '—'],
        ['EMAIL', (entity as Employee).email ?? '—'],
      ]
    : [
        ['PATENTE', (entity as Vehicle).patente],
        ['AÑO', String((entity as Vehicle).anio)],
        ['CHASIS', (entity as Vehicle).chasis ?? '—'],
        ['MOTOR', (entity as Vehicle).motor ?? '—'],
      ]

  const cellW = (infoW - 12) / 2
  const cellH = rowH / 2
  for (let i = 0; i < infoFields.length; i++) {
    const [label, value] = infoFields[i]
    const col = i % 2
    const rowIdx = Math.floor(i / 2)
    const cx = SIDE + col * (cellW + 12)
    const cy = rowTop - rowIdx * cellH
    drawText(page, label, cx, cy - 9, bold, 7, FAINT)
    drawText(
      page,
      truncate(value, regular, 9.5, cellW - 4),
      cx,
      cy - 22,
      regular,
      9.5,
      TEXT
    )
  }

  // Right: 2x2 stats boxes
  const statsX = SIDE + infoW + colGap
  const boxGap = 5
  const boxW = (statsW - boxGap) / 2
  const boxH = (rowH - boxGap) / 2
  const statBoxes: Array<[StatusColor, string]> = [
    ['green', 'Vigentes'],
    ['yellow', 'Por vencer'],
    ['red', 'Vencidos'],
    ['blue', 'Sin venc.'],
  ]
  for (let i = 0; i < statBoxes.length; i++) {
    const [color, label] = statBoxes[i]
    const col = i % 2
    const rowIdx = Math.floor(i / 2)
    const bx = statsX + col * (boxW + boxGap)
    const by = rowTop - boxH - rowIdx * (boxH + boxGap)
    const s = STATUS[color]
    page.drawRectangle({ x: bx, y: by, width: boxW, height: boxH, color: s.bg })
    const numStr = String(cnt[color])
    const numSize = 15
    const numW = bold.widthOfTextAtSize(numStr, numSize)
    drawText(page, numStr, bx + (boxW - numW) / 2, by + boxH - 18, bold, numSize, s.text)
    const labelSize = 7
    const labelW = regular.widthOfTextAtSize(label, labelSize)
    drawText(page, label, bx + (boxW - labelW) / 2, by + 6, regular, labelSize, s.text)
  }

  y = rowTop - rowH - 16

  // ── Index heading divider ──
  // accent mini-bar + title + horizontal rule + count
  page.drawRectangle({ x: SIDE, y: y - 4, width: 18, height: 1.5, color: ACCENT })
  drawText(page, 'Índice de Documentos', SIDE + 24, y - 7, bold, 10, TEXT)
  const titleW = bold.widthOfTextAtSize('Índice de Documentos', 10)
  const ruleStart = SIDE + 24 + titleW + 10
  const countText = `${documents.length} doc${documents.length === 1 ? '' : 's'}`
  const countW = regular.widthOfTextAtSize(countText, 7.5)
  const ruleEnd = PAGE_W - SIDE - countW - 6
  page.drawRectangle({
    x: ruleStart,
    y: y - 4,
    width: Math.max(0, ruleEnd - ruleStart),
    height: 0.5,
    color: BORDER,
  })
  drawText(page, countText, PAGE_W - SIDE - countW, y - 7, regular, 7.5, FAINT)

  y -= 16

  // ── Index table ──
  const tableTop = y
  const colDefs = [
    { key: '#', w: 22, align: 'center' as const },
    { key: 'TIPO DE DOCUMENTO', w: 0, align: 'left' as const }, // flexes
    { key: 'ESTADO', w: 70, align: 'center' as const },
    { key: 'VENCIMIENTO', w: 70, align: 'center' as const },
    { key: 'VER.', w: 32, align: 'center' as const },
    { key: 'ARCH.', w: 36, align: 'center' as const },
  ]
  const tableW = PAGE_W - SIDE * 2
  const fixedW = colDefs.reduce((sum, c) => sum + c.w, 0)
  colDefs[1].w = tableW - fixedW
  const colX: number[] = []
  let cursorX = SIDE
  for (const c of colDefs) {
    colX.push(cursorX)
    cursorX += c.w
  }

  // Table header
  const headH = 16
  page.drawRectangle({
    x: SIDE,
    y: tableTop - headH,
    width: tableW,
    height: headH,
    color: LIGHT,
  })
  page.drawRectangle({
    x: SIDE,
    y: tableTop - headH - 1,
    width: tableW,
    height: 1,
    color: BORDER,
  })
  for (let i = 0; i < colDefs.length; i++) {
    const c = colDefs[i]
    const headerSize = 7
    const text = c.key
    let tx = colX[i] + 6
    if (c.align === 'center') {
      const tw = bold.widthOfTextAtSize(text, headerSize)
      tx = colX[i] + (c.w - tw) / 2
    }
    drawText(page, text, tx, tableTop - headH + 5, bold, headerSize, FAINT)
  }

  // Data rows (compact)
  const rowH2 = 17
  const maxRows = Math.max(
    0,
    Math.floor((tableTop - headH - (footerH + 60)) / rowH2)
  )
  const visibleDocs = documents.slice(0, maxRows)
  let ry = tableTop - headH
  for (let i = 0; i < visibleDocs.length; i++) {
    const row = visibleDocs[i]
    const status = statusOf(row.document)
    const s = STATUS[status]
    ry -= rowH2
    if (i % 2 === 1) {
      page.drawRectangle({
        x: SIDE,
        y: ry,
        width: tableW,
        height: rowH2,
        color: LIGHTER,
      })
    }
    // bottom rule
    page.drawRectangle({
      x: SIDE,
      y: ry,
      width: tableW,
      height: 0.5,
      color: BORDER_LIGHT,
    })

    // # column
    const numStr = String(i + 1).padStart(2, '0')
    const numSize = 8.5
    const numW = regular.widthOfTextAtSize(numStr, numSize)
    drawText(
      page,
      numStr,
      colX[0] + (colDefs[0].w - numW) / 2,
      ry + 5,
      regular,
      numSize,
      FAINT
    )

    // Tipo column: dot + name
    const dotX = colX[1] + 6
    const dotCy = ry + rowH2 / 2
    drawDot(page, dotX + 2.5, dotCy, 2.2, s.dot)
    const nameText = truncate(
      row.document.document_type?.nombre ?? 'Documento',
      regular,
      9,
      colDefs[1].w - 16
    )
    drawText(page, nameText, dotX + 10, ry + 5, regular, 9, TEXT)

    // Estado: small badge centered
    {
      const fontSize = 7
      const text = s.label
      const dotR = 1.6
      const padX = 5
      const padY = 3
      const dotGap = 4
      const textW = bold.widthOfTextAtSize(text, fontSize)
      const inner = dotR * 2 + dotGap + textW
      const width = inner + padX * 2
      const height = fontSize + padY * 2
      const bx = colX[2] + (colDefs[2].w - width) / 2
      const by = ry + (rowH2 - height) / 2 + height
      page.drawRectangle({
        x: bx,
        y: by - height,
        width,
        height,
        color: s.bg,
      })
      drawDot(page, bx + padX + dotR, by - height / 2, dotR, s.dot)
      page.drawText(text, {
        x: bx + padX + dotR * 2 + dotGap,
        y: by - height + padY + 1,
        size: fontSize,
        font: bold,
        color: s.text,
      })
    }

    // Vencimiento
    const vencText = row.document.sin_vencimiento
      ? '—'
      : formatDate(row.document.fecha_vencimiento)
    const vencColor =
      status === 'red' ? STATUS.red.text : status === 'yellow' ? STATUS.yellow.text : MUTED
    const vencFont = status === 'red' || status === 'yellow' ? bold : regular
    const vencSize = 8.5
    const vencW = vencFont.widthOfTextAtSize(vencText, vencSize)
    drawText(
      page,
      vencText,
      colX[3] + (colDefs[3].w - vencW) / 2,
      ry + 5,
      vencFont,
      vencSize,
      vencColor
    )

    // Versión
    const verText = `v${row.document.version ?? 1}`
    const verW = regular.widthOfTextAtSize(verText, 8.5)
    drawText(
      page,
      verText,
      colX[4] + (colDefs[4].w - verW) / 2,
      ry + 5,
      regular,
      8.5,
      FAINT
    )

    // Archivos
    const filesText = String(row.files.length)
    const filesW = regular.widthOfTextAtSize(filesText, 8.5)
    drawText(
      page,
      filesText,
      colX[5] + (colDefs[5].w - filesW) / 2,
      ry + 5,
      regular,
      8.5,
      FAINT
    )
  }

  // Empty-state row
  if (documents.length === 0) {
    drawText(
      page,
      'No hay documentos vigentes para incluir.',
      SIDE + 8,
      ry - 18,
      regular,
      9,
      MUTED
    )
    ry -= 26
  }

  // Overflow notice
  if (documents.length > maxRows) {
    const remaining = documents.length - maxRows
    drawText(
      page,
      `… y ${remaining} documento${remaining === 1 ? '' : 's'} adicional${remaining === 1 ? '' : 'es'} en las páginas siguientes.`,
      SIDE,
      ry - 14,
      regular,
      8,
      MUTED
    )
    ry -= 20
  }

  // ── Legend ──
  const legendY = footerH + 22
  page.drawRectangle({
    x: SIDE,
    y: legendY + 12,
    width: PAGE_W - SIDE * 2,
    height: 0.5,
    color: BORDER_LIGHT,
  })
  let lx = SIDE
  const legendEntries: StatusColor[] = ['green', 'yellow', 'red', 'blue']
  for (const k of legendEntries) {
    const s = STATUS[k]
    drawDot(page, lx + 2.5, legendY + 4, 2.2, s.dot)
    drawText(page, s.label, lx + 9, legendY + 1, regular, 7.5, FAINT)
    lx += 9 + regular.widthOfTextAtSize(s.label, 7.5) + 14
  }
}

// ─── Running header (document pages) ──────────────────────────────────────────

async function drawRunHeader(
  page: PDFPage,
  doc: PDFDocument,
  entity: Employee | Vehicle,
  entityType: ConsolidatedEntityType,
  bold: PDFFont,
  regular: PDFFont,
  logo: LogoAssets,
  pageNum: number,
  totalPages: number
) {
  const headY = PAGE_H - RUN_HEADER_H
  // bottom rule
  page.drawRectangle({
    x: SIDE,
    y: headY + 4,
    width: PAGE_W - SIDE * 2,
    height: 0.5,
    color: BORDER_LIGHT,
  })

  // Logo (left)
  if (logo.bytes) {
    try {
      const img = await doc.embedPng(logo.bytes)
      const lh = 14
      const lw = (img.width / img.height) * lh
      page.drawImage(img, {
        x: SIDE,
        y: PAGE_H - RUN_HEADER_H / 2 - lh / 2 + 2,
        width: lw,
        height: lh,
      })
    } catch {
      drawText(page, 'BASANI', SIDE, PAGE_H - 18, bold, 9, DARK)
    }
  } else {
    drawText(page, 'BASANI', SIDE, PAGE_H - 18, bold, 9, DARK)
  }

  // Entity name (center-left, truncated)
  const nameStart = SIDE + 70
  const today = todayStr()
  const rightText = `Pág. ${pageNum} / ${totalPages}  ·  ${today}`
  const rightW = regular.widthOfTextAtSize(rightText, 8)
  const nameMaxW = PAGE_W - SIDE - rightW - 18 - nameStart
  const nameText = truncate(buildEntityDisplayName(entity, entityType), regular, 9, nameMaxW)

  // little vertical divider before the name
  page.drawRectangle({
    x: nameStart - 12,
    y: PAGE_H - RUN_HEADER_H / 2 - 5,
    width: 0.5,
    height: 10,
    color: BORDER_LIGHT,
  })
  drawText(
    page,
    nameText,
    nameStart,
    PAGE_H - RUN_HEADER_H / 2 - 3,
    regular,
    9,
    MUTED
  )

  // Right: page / total · date
  drawTextRight(
    page,
    rightText,
    PAGE_W - SIDE,
    PAGE_H - RUN_HEADER_H / 2 - 3,
    regular,
    8,
    FAINT
  )
}

// ─── Document page: title block + embedded file content on one sheet ─────────
//
// Each document gets a SINGLE combined page: compact title header at the top
// and the first file's content (PDF first page embedded, or image) below.
// Multi-page PDFs: remaining pages are copied as additional pages after.
// Multiple files: subsequent files follow as additional pages.
// No files: combined page shows title + "no attachments" placeholder.

interface DocPageCtx {
  doc: PDFDocument
  row: DocumentRow
  index: number
  total: number
  entity: Employee | Vehicle
  entityType: ConsolidatedEntityType
  bold: PDFFont
  regular: PDFFont
  logo: LogoAssets
  pageNum: number
  totalPages: number
}

// Returns the number of EXTRA pages added beyond the combined page itself.
async function drawDocWithContent(ctx: DocPageCtx): Promise<number> {
  const { doc, row, index, total, entity, entityType, bold, regular, logo, pageNum, totalPages } = ctx
  const page = doc.addPage([PAGE_W, PAGE_H])
  await drawRunHeader(page, doc, entity, entityType, bold, regular, logo, pageNum, totalPages)

  const status = statusOf(row.document)
  const s = STATUS[status]
  let y = PAGE_H - RUN_HEADER_H - 18

  // ── Compact title block ──
  const headerBlockH = 52
  page.drawRectangle({ x: SIDE, y: y - headerBlockH, width: 3, height: headerBlockH, color: s.dot })

  const docNumLabel = `DOCUMENTO ${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
  drawText(page, docNumLabel, SIDE + 14, y - 8, regular, 7.5, FAINT)

  const titleText = row.document.document_type?.nombre ?? 'Documento'
  const titleMaxW = PAGE_W - SIDE - (SIDE + 14) - 90
  const title = truncate(titleText, bold, 13, titleMaxW)
  drawText(page, title, SIDE + 14, y - 22, bold, 13, TEXT)
  drawBadge({ page, text: s.label, x: PAGE_W - SIDE - 70, y: y - 12, status, bold })

  // Metadata row
  const metaY = y - 38
  const meta: Array<{ label: string; value: string; alert?: boolean }> = []
  if (row.document.numero) meta.push({ label: 'N°', value: row.document.numero })
  meta.push({ label: 'Versión', value: `v${row.document.version ?? 1}` })
  meta.push({ label: 'Emisión', value: formatDate(row.document.fecha_emision) })
  if (row.document.sin_vencimiento) {
    meta.push({ label: 'Vencimiento', value: 'Sin vencimiento' })
  } else {
    meta.push({
      label: status === 'red' ? '⚠ Venció' : 'Vence',
      value: formatDate(row.document.fecha_vencimiento),
      alert: status === 'red' || status === 'yellow',
    })
  }
  let mx = SIDE + 14
  for (const m of meta) {
    drawText(page, `${m.label}:`, mx, metaY, regular, 8.5, MUTED)
    const lw = regular.widthOfTextAtSize(`${m.label}: `, 8.5)
    const vc = m.alert ? (status === 'red' ? STATUS.red.text : STATUS.yellow.text) : TEXT
    drawText(page, m.value, mx + lw, metaY, bold, 8.5, vc)
    mx += lw + bold.widthOfTextAtSize(m.value, 8.5) + 14
    if (mx > PAGE_W - SIDE - 80) break
  }

  // One-line observation (truncated)
  let obsConsumed = 0
  const obs = row.document.observaciones ?? row.document.comentarios
  if (obs && obs.trim().length > 0) {
    const obsLine = truncate(`Obs: ${obs.trim()}`, regular, 8, PAGE_W - SIDE * 2 - 20)
    drawText(page, obsLine, SIDE + 14, y - 52, regular, 8, MUTED)
    obsConsumed = 14
  }

  // Separator between title block and file content
  const separatorY = y - headerBlockH - 6 - obsConsumed
  page.drawRectangle({ x: SIDE, y: separatorY, width: PAGE_W - SIDE * 2, height: 0.5, color: BORDER })

  // ── Content area ──
  const contentTopY = separatorY - 6
  const contentBottomY = 14
  const availW = PAGE_W - 2 * SIDE
  const availH = contentTopY - contentBottomY

  let extraPages = 0

  if (row.files.length === 0) {
    const msg = 'Sin archivos adjuntos para este documento.'
    const msgW = regular.widthOfTextAtSize(msg, 9.5)
    drawText(page, msg, SIDE + (availW - msgW) / 2, contentBottomY + availH / 2 - 4, regular, 9.5, MUTED)
    return 0
  }

  const firstFile = row.files[0]
  const firstBytes = await downloadStorageFile(firstFile.storage_path)

  if (firstBytes) {
    if (firstFile.file_type === 'application/pdf') {
      try {
        const srcPdf = await PDFDocument.load(firstBytes, { ignoreEncryption: true })
        // Embed first page as a scalable form so we can position it below the title
        const [ep] = await doc.embedPdf(srcPdf, [0])
        const scale = Math.min(availW / ep.width, availH / ep.height, 1)
        const sw = ep.width * scale
        const sh = ep.height * scale
        page.drawPage(ep, {
          x: SIDE + (availW - sw) / 2,
          y: contentTopY - sh,
          width: sw,
          height: sh,
        })
        // Copy remaining pages of this PDF as full pages
        if (srcPdf.getPageCount() > 1) {
          const rest = srcPdf.getPageIndices().slice(1)
          const copies = await doc.copyPages(srcPdf, rest)
          copies.forEach((p) => doc.addPage(p))
          extraPages += copies.length
        }
      } catch {
        // skip corrupt PDF — content area stays blank
      }
    } else if (firstFile.file_type === 'image/jpeg' || firstFile.file_type === 'image/png') {
      try {
        const img =
          firstFile.file_type === 'image/jpeg'
            ? await doc.embedJpg(firstBytes)
            : await doc.embedPng(firstBytes)
        const scale = Math.min(availW / img.width, availH / img.height, 1)
        const sw = img.width * scale
        const sh = img.height * scale
        page.drawImage(img, {
          x: SIDE + (availW - sw) / 2,
          y: contentTopY - sh,
          width: sw,
          height: sh,
        })
      } catch {
        // skip
      }
    }
  }

  // Remaining files (files[1..]) — each on its own page(s)
  for (const file of row.files.slice(1)) {
    const bytes = await downloadStorageFile(file.storage_path)
    if (!bytes) continue
    if (file.file_type === 'application/pdf') {
      try {
        const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const copies = await doc.copyPages(srcPdf, srcPdf.getPageIndices())
        copies.forEach((p) => doc.addPage(p))
        extraPages += copies.length
      } catch { /* skip */ }
    } else if (file.file_type === 'image/jpeg' || file.file_type === 'image/png') {
      try {
        const img =
          file.file_type === 'image/jpeg'
            ? await doc.embedJpg(bytes)
            : await doc.embedPng(bytes)
        const imgPage = doc.addPage([PAGE_W, PAGE_H])
        await drawRunHeader(imgPage, doc, entity, entityType, bold, regular, logo, pageNum + 1 + extraPages, totalPages)
        const mw = PAGE_W - SIDE * 2
        const mh = PAGE_H - RUN_HEADER_H - 60
        const sc = Math.min(mw / img.width, mh / img.height, 1)
        imgPage.drawImage(img, {
          x: (PAGE_W - img.width * sc) / 2,
          y: (PAGE_H - RUN_HEADER_H - img.height * sc) / 2 + 20,
          width: img.width * sc,
          height: img.height * sc,
        })
        drawText(imgPage, file.file_name, SIDE, 30, regular, 8, FAINT)
        extraPages += 1
      } catch { /* skip */ }
    }
  }

  return extraPages
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length > 4) {
    const cut = lines.slice(0, 4)
    cut[3] = truncate(cut[3] + ' …', font, size, maxWidth)
    return cut
  }
  return lines
}

// ─── Page planning ────────────────────────────────────────────────────────────
// We need to know totalPages before drawing in order to print "Pág X / Y".
// To get that without actually drawing twice, we pre-flight by counting
// pages per document: 1 title page + best-effort N file pages (using PDF
// page counts from the source files for PDFs; 1 page per image).

interface PlanItem {
  kind: 'doc'
  row: DocumentRow
  filePageCount: number
}

async function planPages(documents: DocumentRow[]): Promise<{
  items: PlanItem[]
  total: number
}> {
  const items: PlanItem[] = []
  let total = 1 // cover/index page
  for (const row of documents) {
    let count = 0
    for (const file of row.files) {
      if (file.file_type === 'application/pdf') {
        const bytes = await downloadStorageFile(file.storage_path)
        if (!bytes) continue
        try {
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
          count += src.getPageCount()
        } catch {
          // skip
        }
      } else if (
        file.file_type === 'image/jpeg' ||
        file.file_type === 'image/png'
      ) {
        count += 1
      }
    }
    items.push({ kind: 'doc', row, filePageCount: count })
    // Combined page: title + first file on same sheet, so a doc with N file
    // pages still only starts a new sheet for each additional page beyond the first.
    total += Math.max(1, count)
  }
  return { items, total }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

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
    doc.setTitle(buildEntityDisplayName(entity, entityType))
    doc.setProducer('Basani Fleet Management')
    doc.setCreator('Basani')

    const regular = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)
    const logo = await loadLogo()

    const { items, total } = await planPages(documents)

    // 1) Cover + Index (page 1 of total)
    await drawCoverIndex({
      doc,
      entity,
      entityType,
      documents,
      bold,
      regular,
      logo,
      pageNum: 1,
      totalPages: total,
    })

    // 2) For each document: one combined page (title + first file) + any extra pages
    let pageCursor = 2
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const extraPages = await drawDocWithContent({
        doc,
        row: item.row,
        index: i + 1,
        total: documents.length,
        entity,
        entityType,
        bold,
        regular,
        logo,
        pageNum: pageCursor,
        totalPages: total,
      })
      pageCursor += 1 + extraPages
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

// Suppress unused-warning for WHITE_40 (kept for color-table parity)
void WHITE_40
