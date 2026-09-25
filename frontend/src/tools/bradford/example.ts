import type { Plate, WellDefinitions } from './types'

const correctedStandards = [1.5003811968, 1.2653916356, 0.9885838395, 0.8251651432, 0.6338933920, 0.3924020139, 0.2328278509, 0.0584954443]

export function createExample(): { plate: Plate; definitions: WellDefinitions } {
  const plate: Plate = Array.from({ length: 8 }, (_, row) => Array.from({ length: 12 }, (_, col) => 0.05 + ((row * 13 + col * 7) % 5) * 0.0002))
  correctedStandards.forEach((value, index) => { plate[1][index] = value + 0.05 })
  plate[1][9] = 0.05; plate[1][10] = 0.05; plate[1][11] = 0.05
  plate[2][0] = 0.70; plate[2][1] = 0.695
  const concentrations = [2000, 1500, 1000, 750, 500, 250, 125, 25]
  const definitions: WellDefinitions = {}
  concentrations.forEach((concentration, index) => { definitions[`B${index + 1}`] = { role: 'standard', concentration } })
  ;['B10', 'B11', 'B12'].forEach((well) => { definitions[well] = { role: 'blank' } })
  definitions.C1 = { role: 'sample', sampleName: 'RM2-A', molecularWeight: 30 }
  definitions.C2 = { role: 'sample', sampleName: 'RM1-B', molecularWeight: 30 }
  return { plate, definitions }
}
