import readXlsxFile, { readSheetNames } from 'read-excel-file'
import { findPlateCandidate, type PlateCandidate } from '../calculations/autodetect'
import type { Plate } from '../types'

export interface WorkbookData {
  name: string
  sheetNames: string[]
  file: File
  kind: 'xlsx' | 'csv'
  csvRows?: unknown[][]
}

export interface DetectedWorkbookPlate extends PlateCandidate {
  sheetName: string
  origin: string
}

export function excelCellToIndices(cell: string): [number, number] {
  const match = /^([A-Z]+)([1-9]\d*)$/i.exec(cell.trim())
  if (!match) throw new Error(`Invalid spreadsheet cell: ${cell}`)
  const column = match[1].toUpperCase().split('').reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1
  return [Number(match[2]) - 1, column]
}

export async function readWorkbook(file: File): Promise<WorkbookData> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return { name: file.name, sheetNames: ['CSV'], file, kind: 'csv', csvRows: parseCsv(await file.text()) }
  }
  const sheetNames = await readSheetNames(file)
  if (!sheetNames.length) throw new Error('The workbook does not contain any worksheets.')
  return { name: file.name, sheetNames, file, kind: 'xlsx' }
}

export async function parsePlate(workbook: WorkbookData, sheetName: string, origin: string): Promise<Plate> {
  const rows = await readSheetRows(workbook, sheetName)
  const [startRow, startColumn] = excelCellToIndices(origin)
  return Array.from({ length: 8 }, (_, row) => Array.from({ length: 12 }, (_, column) => {
    const value = rows[startRow + row]?.[startColumn + column]
    if (value === null || value === undefined || value === '') return 0
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numeric)) {
      const cell = encodeCell(startRow + row, startColumn + column)
      throw new Error(`Expected a numeric plate value at ${cell}, but found ${value === null ? 'an empty cell' : `“${String(value)}”`}.`)
    }
    return numeric
  }))
}

export async function autoDetectWorkbookPlate(workbook: WorkbookData): Promise<DetectedWorkbookPlate> {
  let best: DetectedWorkbookPlate | undefined
  for (const sheetName of workbook.sheetNames) {
    const candidate = findPlateCandidate(await readSheetRows(workbook, sheetName))
    if (!candidate) continue
    const detected = { ...candidate, sheetName, origin: encodeCell(candidate.startRow, candidate.startColumn) }
    if (!best || detected.score > best.score) best = detected
  }
  if (!best) throw new Error('Could not find a complete 8 × 12 numeric plate. Select the worksheet and A1 cell manually.')
  return best
}

async function readSheetRows(workbook: WorkbookData, sheetName: string): Promise<unknown[][]> {
  return workbook.kind === 'csv' ? workbook.csvRows! : await readXlsxFile(workbook.file, { sheet: sheetName })
}

function encodeCell(row: number, column: number) {
  let label = ''
  for (let value = column + 1; value > 0; value = Math.floor((value - 1) / 26)) label = String.fromCharCode(65 + ((value - 1) % 26)) + label
  return `${label}${row + 1}`
}

function parseCsv(text: string): unknown[][] {
  const rows: string[][] = [[]]
  let value = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { rows.at(-1)!.push(value); value = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      rows.at(-1)!.push(value); value = ''; rows.push([])
    } else value += char
  }
  rows.at(-1)!.push(value)
  if (rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === '') rows.pop()
  return rows
}
