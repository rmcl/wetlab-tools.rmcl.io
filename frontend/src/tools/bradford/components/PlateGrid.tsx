import type { Plate, WellDefinitions } from '../types'

const rows = 'ABCDEFGH'.split('')

function roleClass(role?: string) {
  if (role === 'standard') return 'well-standard'
  if (role === 'blank') return 'well-blank'
  if (role === 'sample') return 'well-sample'
  return ''
}

export function PlateGrid({ plate, definitions, selected, onToggle }: {
  plate: Plate
  definitions: WellDefinitions
  selected: Set<string>
  onToggle: (well: string) => void
}) {
  const values = plate.flat()
  const min = Math.min(...values)
  const max = Math.max(...values)
  return (
    <div className="plate-scroll overflow-x-auto pb-2">
      <div className="plate-grid" role="grid" aria-label="96-well plate">
        <span />
        {Array.from({ length: 12 }, (_, col) => <span key={col} className="self-end pb-1 text-center text-xs font-semibold text-slate-500">{col + 1}</span>)}
        {rows.map((rowLabel, row) => [
          <span key={`${rowLabel}-label`} className="grid place-items-center text-xs font-semibold text-slate-500">{rowLabel}</span>,
          ...plate[row].map((value, col) => {
            const well = `${rowLabel}${col + 1}`
            const intensity = max === min ? 0.25 : (value - min) / (max - min)
            const role = definitions[well]?.role
            return (
              <button
                key={well}
                type="button"
                role="gridcell"
                aria-selected={selected.has(well)}
                aria-label={`${well}, absorbance ${value.toFixed(3)}${role ? `, ${role}` : ''}`}
                onClick={() => onToggle(well)}
                className={`well relative px-1 py-1.5 text-center ${roleClass(role)} ${selected.has(well) ? 'well-selected' : ''}`}
                style={{ backgroundColor: `color-mix(in srgb, #0b8068 ${10 + intensity * 55}%, white)` }}
              >
                <span className="block text-[10px] font-semibold text-slate-600">{well}</span>
                <span className="block text-xs font-medium tabular-nums text-slate-950">{value.toFixed(3)}</span>
              </button>
            )
          }),
        ])}
      </div>
    </div>
  )
}

