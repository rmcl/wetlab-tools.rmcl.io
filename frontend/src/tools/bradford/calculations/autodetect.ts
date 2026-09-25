import { fitQuadratic } from './bradford'
import type { Plate, WellDefinitions } from '../types'

export const DEFAULT_STANDARD_CONCENTRATIONS = [2000, 1500, 1000, 750, 500, 250, 125, 25] as const

export interface PlateCandidate {
  plate: Plate
  startRow: number
  startColumn: number
  score: number
  rowLabelMatches: number
  columnLabelMatches: number
  numericDensity: number
}

export interface AssayDetection {
  definitions: WellDefinitions
  standardWells: string[]
  blankWells: string[]
  blankAverage: number
  blankStandardDeviation: number
  sampleThreshold: number
  sampleCount: number
  confidence: 'high' | 'medium' | 'low'
  message: string
}

const rowLetters = 'ABCDEFGH'

function numeric(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const result = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(result) ? result : undefined
}

function standardDeviation(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length)
}

export function blankSampleThreshold(values: number[]) {
  if (!values.length) return { mean: 0, standardDeviation: 0, threshold: 0 }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const standardDeviation = values.length < 2
    ? 0
    : Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1))
  return { mean, standardDeviation, threshold: mean + 2 * standardDeviation }
}

export function findPlateCandidate(rows: unknown[][]): PlateCandidate | undefined {
  const maxColumns = Math.max(0, ...rows.map((row) => row.length))
  let best: PlateCandidate | undefined
  for (let startRow = 0; startRow <= rows.length - 8; startRow += 1) {
    for (let startColumn = 0; startColumn <= maxColumns - 12; startColumn += 1) {
      const plate: number[][] = []
      let valid = true
      let numericCount = 0
      for (let row = 0; row < 8 && valid; row += 1) {
        const values: number[] = []
        for (let column = 0; column < 12; column += 1) {
          const rawValue = rows[startRow + row]?.[startColumn + column]
          if (rawValue === null || rawValue === undefined || rawValue === '') {
            values.push(0)
            continue
          }
          const value = numeric(rawValue)
          if (value === undefined) { valid = false; break }
          numericCount += 1
          values.push(value)
        }
        plate.push(values)
      }
      if (!valid) continue
      const values = plate.flat()
      const plausible = values.filter((value) => value >= 0 && value <= 5).length / 96
      const spread = standardDeviation(values)
      const distinct = new Set(values.map((value) => value.toFixed(6))).size
      const rowLabelMatches = startColumn > 0
        ? Array.from({ length: 8 }, (_, index) => String(rows[startRow + index]?.[startColumn - 1] ?? '').trim().toUpperCase() === rowLetters[index]).filter(Boolean).length
        : 0
      const columnLabelMatches = startRow > 0
        ? Array.from({ length: 12 }, (_, index) => numeric(rows[startRow - 1]?.[startColumn + index]) === index + 1).filter(Boolean).length
        : 0
      const numericDensity = numericCount / 96
      const stronglyLabeled = rowLabelMatches >= 6 && columnLabelMatches >= 9
      if (!stronglyLabeled && numericDensity < 0.85) continue
      const score = rowLabelMatches * 18 + columnLabelMatches * 11 + numericDensity * 30 + plausible * 18 + Math.min(spread, 1) * 8 + Math.min(distinct, 24) / 3 - startRow * 0.002 - startColumn * 0.002
      const candidate = { plate, startRow, startColumn, score, rowLabelMatches, columnLabelMatches, numericDensity }
      if (!best || candidate.score > best.score) best = candidate
    }
  }
  return best
}

function wellName(row: number, column: number) { return `${rowLetters[row]}${column + 1}` }

export function detectAssayLayout(plate: Plate): AssayDetection {
  let best: { row: number; start: number; score: number; monotonicity: number; r2: number } | undefined
  for (let row = 0; row < 8; row += 1) {
    for (let start = 0; start <= 4; start += 1) {
      const absorbances = plate[row].slice(start, start + 8)
      const range = Math.max(...absorbances) - Math.min(...absorbances)
      if (range < 0.02 || absorbances.some((value) => !Number.isFinite(value) || value < 0)) continue
      const monotonicity = absorbances.slice(0, -1).filter((value, index) => value > absorbances[index + 1]).length / 7
      let r2 = -1
      try {
        r2 = fitQuadratic(absorbances.map((absorbance, index) => ({ absorbance, concentration: DEFAULT_STANDARD_CONCENTRATIONS[index] }))).r2
      } catch { continue }
      const score = monotonicity * 58 + Math.max(0, r2) * 34 + Math.min(range / 1.5, 1) * 8
      if (!best || score > best.score) best = { row, start, score, monotonicity, r2 }
    }
  }

  const definitions: WellDefinitions = {}
  const standardWells: string[] = []
  const blankWells: string[] = []
  const standardsAccepted = Boolean(best && best.monotonicity >= 5 / 7 && best.r2 >= 0.8)

  if (best && standardsAccepted) {
    DEFAULT_STANDARD_CONCENTRATIONS.forEach((concentration, index) => {
      const well = wellName(best!.row, best!.start + index)
      standardWells.push(well)
      definitions[well] = { role: 'standard', concentration }
    })

    const standardSet = new Set(standardWells)
    const remaining = plate.flatMap((values, row) => values.map((value, column) => ({ well: wellName(row, column), value, row, column })))
      .filter((item) => !standardSet.has(item.well))
    const windows: Array<{ items: typeof remaining; score: number }> = []
    for (let row = 0; row < 8; row += 1) {
      for (let start = 0; start <= 9; start += 1) {
        const items = remaining.filter((item) => item.row === row && item.column >= start && item.column < start + 3)
        if (items.length !== 3 || items.some((item) => item.value <= 0)) continue
        const values = items.map((item) => item.value)
        const mean = values.reduce((sum, value) => sum + value, 0) / 3
        const relativeSpread = standardDeviation(values) / Math.max(mean, 0.001)
        windows.push({ items, score: mean + relativeSpread * 0.05 })
      }
    }
    const bestWindow = windows.sort((a, b) => a.score - b.score)[0]
    const pool = bestWindow?.items ?? remaining.filter((item) => item.value > 0).sort((a, b) => a.value - b.value).slice(0, 3)
    pool.forEach((item) => {
      blankWells.push(item.well)
      definitions[item.well] = { role: 'blank' }
    })
  }

  const assigned = new Set([...standardWells, ...blankWells])
  const blankValues = blankWells.map((well) => {
    const row = well.charCodeAt(0) - 65
    const column = Number(well.slice(1)) - 1
    return plate[row][column]
  })
  const { mean: blankAverage, standardDeviation: blankStandardDeviation, threshold: sampleThreshold } = blankSampleThreshold(blankValues)
  let sampleCount = 0
  plate.forEach((values, row) => values.forEach((value, column) => {
    const well = wellName(row, column)
    if (!assigned.has(well) && value > sampleThreshold) {
      definitions[well] = { role: 'sample', sampleName: well }
      sampleCount += 1
    }
  }))

  const confidence = !standardsAccepted ? 'low' : best!.score >= 88 ? 'high' : 'medium'
  const message = standardsAccepted
    ? `Detected standards ${standardWells[0]}–${standardWells.at(-1)}, blanks ${blankWells.join(', ')} (mean ${blankAverage.toFixed(3)}, SD ${blankStandardDeviation.toFixed(3)}), and ${sampleCount} wells above the ${sampleThreshold.toFixed(3)} sample threshold.`
    : `The plate was found, but no eight-well standards series was detected confidently. Wells above the ${sampleThreshold.toFixed(3)} blank-noise threshold were labeled as samples for review.`
  return { definitions, standardWells, blankWells, blankAverage, blankStandardDeviation, sampleThreshold, sampleCount, confidence, message }
}
