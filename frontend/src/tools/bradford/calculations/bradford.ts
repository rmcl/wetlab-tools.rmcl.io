import type { AnalysisResult, CurveFit, Plate, StandardPoint, WellDefinitions } from '../types'

export function wellToIndices(well: string): [number, number] {
  const match = /^([A-H])(1[0-2]|[1-9])$/i.exec(well.trim())
  if (!match) throw new Error(`Invalid well: ${well}`)
  return [match[1].toUpperCase().charCodeAt(0) - 65, Number(match[2]) - 1]
}

export function plateValue(plate: Plate, well: string): number {
  const [row, col] = wellToIndices(well)
  const value = plate[row]?.[col]
  if (!Number.isFinite(value)) throw new Error(`Well ${well} does not contain a numeric value.`)
  return value
}

function solve3(matrix: number[][], vector: number[]): [number, number, number] {
  const augmented = matrix.map((row, index) => [...row, vector[index]])
  for (let column = 0; column < 3; column += 1) {
    let pivot = column
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row
    }
    ;[augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]]
    if (Math.abs(augmented[column][column]) < 1e-12) throw new Error('The standard points cannot produce a stable quadratic fit.')
    const divisor = augmented[column][column]
    for (let c = column; c < 4; c += 1) augmented[column][c] /= divisor
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue
      const factor = augmented[row][column]
      for (let c = column; c < 4; c += 1) augmented[row][c] -= factor * augmented[column][c]
    }
  }
  return [augmented[0][3], augmented[1][3], augmented[2][3]]
}

export function evaluateCurve(coefficients: [number, number, number], absorbance: number): number {
  const [a, b, c] = coefficients
  return a * absorbance * absorbance + b * absorbance + c
}

export function fitQuadratic(points: Array<{ absorbance: number; concentration: number }>): CurveFit {
  if (points.length < 3) throw new Error('Define at least three standards to fit a quadratic curve.')
  const n = points.length
  const sums = points.reduce((acc, point) => {
    const x = point.absorbance
    const y = point.concentration
    acc.x += x; acc.x2 += x ** 2; acc.x3 += x ** 3; acc.x4 += x ** 4
    acc.y += y; acc.xy += x * y; acc.x2y += x ** 2 * y
    return acc
  }, { x: 0, x2: 0, x3: 0, x4: 0, y: 0, xy: 0, x2y: 0 })
  const coefficients = solve3(
    [[sums.x4, sums.x3, sums.x2], [sums.x3, sums.x2, sums.x], [sums.x2, sums.x, n]],
    [sums.x2y, sums.xy, sums.y],
  )
  const mean = sums.y / n
  const residual = points.reduce((sum, p) => sum + (p.concentration - evaluateCurve(coefficients, p.absorbance)) ** 2, 0)
  const total = points.reduce((sum, p) => sum + (p.concentration - mean) ** 2, 0)
  return {
    coefficients,
    r2: total === 0 ? 1 : 1 - residual / total,
    minAbsorbance: Math.min(...points.map((p) => p.absorbance)),
    maxAbsorbance: Math.max(...points.map((p) => p.absorbance)),
  }
}

function sampleDeviation(values: number[]): number | undefined {
  if (values.length < 2) return undefined
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1))
}

export function analyzeBradford(plate: Plate, definitions: WellDefinitions): AnalysisResult {
  const entries = Object.entries(definitions)
  const blanks = entries.filter(([, d]) => d.role === 'blank').map(([well]) => plateValue(plate, well))
  if (!blanks.length) throw new Error('Define at least one blank well.')
  const blank = blanks.reduce((sum, value) => sum + value, 0) / blanks.length

  const standards: StandardPoint[] = entries
    .filter(([, d]) => d.role === 'standard' && Number.isFinite(d.concentration))
    .map(([well, d]) => ({ well, absorbance: plateValue(plate, well) - blank, concentration: d.concentration! }))
  const fit = fitQuadratic(standards)

  const groups = new Map<string, Array<{ well: string; absorbance: number; molecularWeight?: number }>>()
  entries.filter(([, d]) => d.role === 'sample').forEach(([well, d]) => {
    const name = d.sampleName?.trim() || well
    const group = groups.get(name) ?? []
    group.push({ well, absorbance: plateValue(plate, well) - blank, molecularWeight: d.molecularWeight })
    groups.set(name, group)
  })

  const samples = [...groups.entries()].map(([name, replicates]) => {
    const absorbances = replicates.map((r) => r.absorbance)
    const absorbance = absorbances.reduce((sum, value) => sum + value, 0) / absorbances.length
    const concentration = evaluateCurve(fit.coefficients, absorbance)
    const molecularWeight = replicates.find((r) => r.molecularWeight)?.molecularWeight
    return {
      name,
      wells: replicates.map((r) => r.well),
      absorbance,
      concentration,
      molecularWeight,
      micromolar: molecularWeight ? concentration / molecularWeight : undefined,
      standardDeviation: sampleDeviation(absorbances),
      outsideRange: absorbance < fit.minAbsorbance || absorbance > fit.maxAbsorbance,
    }
  })
  return { blank, standards, fit, samples }
}

