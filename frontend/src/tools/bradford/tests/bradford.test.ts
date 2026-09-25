import { describe, expect, it } from 'vitest'
import { analyzeBradford, evaluateCurve, fitQuadratic, wellToIndices } from '../calculations/bradford'
import { createExample } from '../example'
import { DEFAULT_STANDARD_CONCENTRATIONS, blankSampleThreshold, detectAssayLayout, findPlateCandidate } from '../calculations/autodetect'
import { excelCellToIndices } from '../spreadsheet/parseWorkbook'
import { deleteStoredBradfordRun, getStoredBradfordRun, listStoredBradfordRuns, saveStoredBradfordRun } from '../storage/localLibrary'

describe('Bradford calculations', () => {
  it('converts plate and spreadsheet coordinates', () => {
    expect(wellToIndices('A1')).toEqual([0, 0])
    expect(wellToIndices('H12')).toEqual([7, 11])
    expect(excelCellToIndices('B2')).toEqual([1, 1])
    expect(excelCellToIndices('AA10')).toEqual([9, 26])
  })

  it('fits a quadratic concentration-on-absorbance model', () => {
    const fit = fitQuadratic([0, 1, 2, 3].map((x) => ({ absorbance: x, concentration: 2 * x * x + 3 * x + 4 })))
    expect(fit.coefficients[0]).toBeCloseTo(2, 8)
    expect(fit.coefficients[1]).toBeCloseTo(3, 8)
    expect(fit.coefficients[2]).toBeCloseTo(4, 8)
    expect(fit.r2).toBeCloseTo(1, 10)
    expect(evaluateCurve(fit.coefficients, 2.5)).toBeCloseTo(24, 8)
  })

  it('matches the reference notebook sample results', () => {
    const { plate, definitions } = createExample()
    const result = analyzeBradford(plate, definitions)
    expect(result.blank).toBeCloseTo(0.05, 8)
    expect(result.samples.find((sample) => sample.name === 'RM2-A')?.concentration).toBeCloseTo(519.28, 1)
    expect(result.samples.find((sample) => sample.name === 'RM2-A')?.micromolar).toBeCloseTo(17.31, 1)
    expect(result.samples.find((sample) => sample.name === 'RM1-B')?.concentration).toBeCloseTo(513.26, 1)
    expect(result.samples.find((sample) => sample.name === 'RM1-B')?.micromolar).toBeCloseTo(17.11, 1)
  })

  it('requires blanks and at least three standards', () => {
    const { plate } = createExample()
    expect(() => analyzeBradford(plate, {})).toThrow('blank')
  })

  it('detects a labeled plate rectangle and its A1 origin', () => {
    const { plate } = createExample()
    const rows: unknown[][] = Array.from({ length: 11 }, () => Array(15).fill(null))
    for (let col = 0; col < 12; col += 1) rows[1][col + 2] = col + 1
    for (let row = 0; row < 8; row += 1) {
      rows[row + 2][1] = 'ABCDEFGH'[row]
      for (let col = 0; col < 12; col += 1) rows[row + 2][col + 2] = plate[row][col]
    }
    const candidate = findPlateCandidate(rows)
    expect(candidate?.startRow).toBe(2)
    expect(candidate?.startColumn).toBe(2)
    expect(candidate?.rowLabelMatches).toBe(8)
    expect(candidate?.columnLabelMatches).toBe(12)
  })

  it('detects a partially populated labeled plate and fills empty wells with zero', () => {
    const rows: unknown[][] = Array.from({ length: 48 }, () => Array(15).fill(null))
    for (let col = 0; col < 12; col += 1) rows[37][col + 2] = col + 1
    for (let row = 0; row < 8; row += 1) rows[row + 38][1] = 'ABCDEFGH'[row]
    const populated = [
      [1.947, 1.681, 1.491, 1.276, 1.157, 0.817, 0.616, 0.447, 0.05, 0.44, 0.445, 0.454],
      [0.05, 0.05, 0.051, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.049],
      [0.66, 1.063, 1.19, 0.74, 0.673, 0.982, 0.579, 0.05, 0.05, 0.05, 0.05, 0.05],
      [1.167, 1.233, 1.242, 0.905, 1.72, 1.328, 0.502, 0.467, 0.66, 0.05, 0.05, 0.05],
      [0.05, 0.05, 0.05, 0.051, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    ]
    populated.forEach((values, row) => values.forEach((value, col) => { rows[row + 38][col + 2] = value }))
    const candidate = findPlateCandidate(rows)
    expect(candidate?.startRow).toBe(38)
    expect(candidate?.startColumn).toBe(2)
    expect(candidate?.numericDensity).toBeCloseTo(60 / 96, 8)
    expect(candidate?.plate[7][11]).toBe(0)
    const layout = detectAssayLayout(candidate!.plate)
    expect(layout.standardWells).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'])
    expect(layout.blankWells).toHaveLength(3)
    expect(layout.blankWells.every((well) => well.startsWith('B'))).toBe(true)
    expect(layout.blankAverage).toBeCloseTo(0.05, 2)
  })

  it('assigns default standards, likely blanks, and remaining nonzero samples', () => {
    const { plate } = createExample()
    const detected = detectAssayLayout(plate)
    expect(detected.standardWells).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'])
    expect(detected.standardWells.map((well) => detected.definitions[well].concentration)).toEqual([...DEFAULT_STANDARD_CONCENTRATIONS])
    expect(detected.blankWells).toEqual(['B10', 'B11', 'B12'])
    expect(detected.blankAverage).toBeCloseTo(0.05, 8)
    expect(detected.definitions.A1).toBeUndefined()
    expect(detected.definitions.C1).toEqual({ role: 'sample', sampleName: 'C1' })
  })

  it('uses blank mean plus two sample standard deviations as the sample threshold', () => {
    const threshold = blankSampleThreshold([0.4, 0.41, 0.42])
    expect(threshold.mean).toBeCloseTo(0.41, 8)
    expect(threshold.standardDeviation).toBeCloseTo(0.01, 8)
    expect(threshold.threshold).toBeCloseTo(0.43, 8)
    expect(0.414).toBeLessThan(threshold.threshold)
  })

  it('stores, lists, restores, and deletes browser-local runs', () => {
    const values = new Map<string, string>()
    const storage: Storage = {
      get length() { return values.size },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => { values.delete(key) },
      setItem: (key, value) => { values.set(key, value) },
    }
    const { plate, definitions } = createExample()
    saveStoredBradfordRun({
      id: 'run-1', filename: 'plate.xlsx', fileType: 'application/xlsx', fileDataUrl: 'data:test', fileSize: 100,
      savedAt: '2026-09-25T10:00:00.000Z', sampleCount: 2, hasResults: true, sheetName: 'Sheet1', origin: 'B2', plate, definitions,
    }, storage)
    expect(listStoredBradfordRuns(storage)).toHaveLength(1)
    expect(getStoredBradfordRun('run-1', storage)?.filename).toBe('plate.xlsx')
    deleteStoredBradfordRun('run-1', storage)
    expect(listStoredBradfordRuns(storage)).toHaveLength(0)
  })
})
