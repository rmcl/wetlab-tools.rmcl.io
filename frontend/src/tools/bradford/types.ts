export type Plate = number[][]
export type WellRole = 'unused' | 'standard' | 'blank' | 'sample'

export interface WellDefinition {
  role: WellRole
  concentration?: number
  sampleName?: string
  molecularWeight?: number
}

export type WellDefinitions = Record<string, WellDefinition>

export interface StandardPoint {
  well: string
  absorbance: number
  concentration: number
}

export interface CurveFit {
  coefficients: [number, number, number]
  r2: number
  minAbsorbance: number
  maxAbsorbance: number
}

export interface SampleResult {
  name: string
  wells: string[]
  absorbance: number
  concentration: number
  molecularWeight?: number
  micromolar?: number
  standardDeviation?: number
  outsideRange: boolean
}

export interface AnalysisResult {
  blank: number
  standards: StandardPoint[]
  fit: CurveFit
  samples: SampleResult[]
}

